from typing import Union
from langchain import PromptTemplate
from langchain.callbacks import get_openai_callback
from langchain.chat_models import ChatOpenAI

# from langchain.schema.language_model import BaseChatModel
from langchain.chat_models.base import BaseChatModel
from langchain.llms.base import BaseLLM
from langchain.prompts import ChatPromptTemplate
from langchain.prompts.chat import HumanMessagePromptTemplate
from langchain.schema.messages import SystemMessage
from pydantic import ValidationError
from tenacity import retry, retry_if_exception_type, stop_after_attempt

from music_generator.music_generator_types import (
    Bar,
    Config,
    MarkupSection,
    MarkupInstrument,
)
from music_generator.utilities.logs import get_logger

logger = get_logger(__name__)


@retry(
    retry=(
        retry_if_exception_type(ValidationError) | retry_if_exception_type(ValueError)
    ),
    stop=stop_after_attempt(3),
)
def generate_section(
    config: Config, llm: Union[BaseChatModel, BaseLLM], section: MarkupSection
) -> Bar:  # fix
    # model_name = "text-davinci-003"
    # temperature = 0.0
    # model = OpenAI(model_name=model_name, temperature=temperature)

    # Set up a parser + inject instructions into the prompt template.

    # Note, {{ in an fstring produces a single {
    format_instructions = f"""Your format should be an array of bars where each instrument has 16 notes per bar seperated by spaces.

each bar should be wrapped in {{{{{{ and }}}}}} for me to extract.

Each bar should be formatted as follows:

{Bar.example().to_llm_format()}
"""
    if isinstance(llm, BaseLLM):
        # https://python.langchain.com/docs/modules/model_io/prompts/prompt_templates/#chat-prompt-template
        # Note, if you don't use format for the format instructions, the formatting will try
        # to interpret the {{ as a format string, and fail.
        prompt_template: PromptTemplate = PromptTemplate.from_template(
            "Do the following task.\n{format_instructions}\n{prompt}"
        )
        _input = prompt_template.format(
            format_instructions=format_instructions,
            prompt="Generate an interesting bar of a house song.",
        )
        logger.debug("Prompt:\n" + _input)

        with get_openai_callback() as cb:
            output = llm(_input)
        result = output
    else:
        # https://python.langchain.com/docs/modules/model_io/prompts/prompt_templates/#chat-prompt-template
        chat_prompt_template: ChatPromptTemplate = ChatPromptTemplate.from_messages(  # pyright: ignore[reportUnknownMemberType]
            [
                SystemMessage(content=f"Answer the user query.\n{format_instructions}"),
                HumanMessagePromptTemplate.from_template("{prompt}"),
            ]
        )
        _input = chat_prompt_template.format_messages(
            format_instructions=format_instructions,
            prompt=f"generate {section.number_bars} bars using the following descriptions: {section.instruments}",
        )
        logger.debug(
            "Prompt:\n" + "\n".join([f"{x.type}: {x.content}" for x in _input])
        )

        with get_openai_callback() as cb:
            output = llm(_input)

        logger.info(
            f"Used {cb.total_tokens} tokens ({cb.prompt_tokens} prompt, {cb.completion_tokens} completion) @ ${(cb.total_cost):.3f}"
        )
        result = output.content
    logger.debug(f"Output:\n{result}")
    deserialized_bar = Bar.from_llm_format(result)

    return deserialized_bar


if __name__ == "__main__":
    from dotenv import dotenv_values

    config = Config(**dotenv_values())  # type: ignore
    llm = ChatOpenAI(
        openai_api_key=config.openai_api_key, model="gpt-4", temperature=0.1
    )

    sections = {
        "Intro": MarkupSection(
            number_bars=8,
            instruments={
                "Pad": MarkupInstrument(
                    description="The pad will begin the track, starting at a low volume but gradually increasing in intensity to create a musical build-up.",
                    dependencies=[],
                ),
                "Bass": MarkupInstrument(
                    description="The bass will be silent in this section.",
                    dependencies=[],
                ),
                "Drums": MarkupInstrument(
                    description="Only the hi-hat will play in this section, following a steady rhythm with a few quick flourishes in each bar to keep the beat engaging.",
                    dependencies=[],
                ),
            },
        ),
        "verse-1": MarkupSection(
            number_bars=1,
            instruments={
                "Pad": MarkupInstrument(
                    description="The pad will continue from the intro, playing sustained chord progressions that provide the track's harmonic backbone. Some chords will be held for longer periods to add tension.",
                    dependencies=[],
                ),
                "Bass": MarkupInstrument(
                    description="The bass will join, playing a deep groove that complements the chord progressions of the pad.",
                    dependencies=[],
                ),
                "Drums": MarkupInstrument(
                    description="The full drum kit is introduced now with a steady kick-snare pattern.",
                    dependencies=[],
                ),
            },
        ),
        "Chorus": MarkupSection(
            number_bars=16,
            instruments={
                "Pad": MarkupInstrument(
                    description="Modulates to uplifting chord sequences to differentiate this section from %verse-1.",
                    dependencies=["verse-1"],
                ),
                "Bass": MarkupInstrument(
                    description="Maintains a steady rhythm but switches to a higher octave to add energy and accompany the uplifting chords from the pad.",
                    dependencies=[],
                ),
                "Drums": MarkupInstrument(
                    description="The kick and snare pattern becomes more complex to provide extra energy.",
                    dependencies=[],
                ),
            },
        ),
        "verse-2": MarkupSection(
            number_bars=2,
            instruments={
                "Pad": MarkupInstrument(
                    description="The pad reverts to the chord progressions from %verse-1 but with a single additional high melody line for variation.",
                    dependencies=["verse-1"],
                ),
                "Bass": MarkupInstrument(
                    description="Returns to the original deep groove from %verse-1, but with slight rhythmic variations to keep it fresh.",
                    dependencies=["verse-1"],
                ),
                "Drums": MarkupInstrument(
                    description="The kick and snare continue their complex pattern from the chorus, but the hi-hat switches to a more intricate rhythm.",
                    dependencies=[],
                ),
            },
        ),
        "Outro": MarkupSection(
            number_bars=8,
            instruments={
                "Pad": MarkupInstrument(
                    description="Begins to slowly fade out while maintaining the %verse-2 melody.",
                    dependencies=["verse-2"],
                ),
                "Bass": MarkupInstrument(
                    description="The bass also starts to fade but plays simplified versions of its rhythm from %verse-2.",
                    dependencies=["verse-2"],
                ),
                "Drums": MarkupInstrument(
                    description="Only the kick remains, slowing its beat until eventually stopping in sync with the fading pad and bass.",
                    dependencies=[],
                ),
            },
        ),
    }
    for section in sections:
        print(sections[section])

    # section = generate_section(config=config, llm=llm, section=)
    # logger.info(f"Generated Bar:\n{bar}")
