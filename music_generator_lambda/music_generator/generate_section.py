import logging
from typing import Union

# from langchain import PromptTemplate
from langchain.callbacks import get_openai_callback
from langchain.chat_models import ChatOpenAI

# from langchain.schema.language_model import BaseChatModel
from langchain.chat_models.base import BaseChatModel
from langchain.llms.base import BaseLLM
from langchain.prompts import ChatPromptTemplate
from langchain.prompts.chat import HumanMessagePromptTemplate
from langchain.schema.messages import SystemMessage
from pydantic import ValidationError
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
)

from music_generator.music_generator_types import (
    Bar,
    Config,
    MarkupInstrument,
    MarkupSection,
    Song,
    SongSection,
)
from music_generator.utilities.logs import get_logger

logger = get_logger(__name__)


@retry(
    # This line makes tenacity log the produced exception before sleeping for its wait-interval
    before_sleep=before_sleep_log(logger, logging.WARNING),
    retry=(
        retry_if_exception_type(ValidationError) | retry_if_exception_type(ValueError)
    ),
    stop=stop_after_attempt(3),
)
def generate_section(
    markup_section: MarkupSection,
    prev_gens: Song,
    llm: Union[BaseChatModel, BaseLLM],
) -> SongSection:
    """
    Generate the notes of a song (SongSection) from an abstract description (MarkupSection) using the given LLM.
    """

    def generate_instrument_description(
        instrument_name: str, prev_sections: Song
    ):  # Dependency generation
        instrument = markup_section.instruments[instrument_name]
        description = f"{instrument.description}"

        if instrument.dependencies:  # populate dependencies
            for dependency in instrument.dependencies:
                for i in range(len(prev_sections)):  # search for section in prev_gens
                    if (
                        prev_sections[i].name.upper() == dependency.upper()
                    ):  # check if there is a match
                        matched = prev_sections[i].bars[0][
                            instrument_name.upper()
                        ]  # get measure
                        description += f" {dependency} {instrument} is {matched}."  # add dependency

        return description

    if isinstance(llm, BaseLLM):
        raise NotImplementedError("This only works with chat models")
    else:
        # https://python.langchain.com/docs/modules/model_io/prompts/prompt_templates/#chat-prompt-template
        chat_prompt_template: ChatPromptTemplate = ChatPromptTemplate.from_messages(  # pyright: ignore[reportUnknownMemberType]
            [
                SystemMessage(
                    content=f"""Your job is to take a text description of a section of a song and express it in a machine readable tabular format.

# Formatting:
- Your output will be a sequence of bars.
- Each bar is enclosed by triple braces on each side: {{{{{{ content }}}}}}.
- Always use 16 notes per bar (Each is a 16th note)
- Always specify the activity of *all* instruments in every bar.
- Don't use shorthand such as "repeats 4 times" or "bars 1-4 are ...". Even if your bar repeats, write them out in full.
- An example of a properly formatted bar is as follows:
{Bar.example().to_llm_format()}

The text you produce will be programatically parsed into a song. Please follow the format instructions carefully.
""".strip()
                ),
                HumanMessagePromptTemplate.from_template("{prompt}"),
            ]
        )
        _input = chat_prompt_template.format_messages(
            prompt=f"""Generate {markup_section.number_bars} bars of a house song using the following descriptions...

Bass: {generate_instrument_description('Bass', prev_gens)}
Pad: {generate_instrument_description('Pad', prev_gens)}
Drums: {generate_instrument_description('Drums', prev_gens)}""".strip(),
        )
        # prompt=f"""generate {markup_section.number_bars} bars of a house song using the following descriptions:
        #    bass : {markup_section.instruments['Bass'].description}
        #     pad: {markup_section.instruments['Pad'].description}
        #      drums:{markup_section.instruments['Drums'].description}"""

        logger.debug(
            "Prompt:\n" + "\n".join([f"{x.type}: {x.content}" for x in _input])
        )

        with get_openai_callback() as cb:
            logger.info("Generating section (this make take a while)...")
            output = llm(_input)

        logger.info(
            f"Used {cb.total_tokens} tokens ({cb.prompt_tokens} prompt, {cb.completion_tokens} completion) @ ${(cb.total_cost):.3f}"
        )
        result = output.content

    logger.debug(f"Output:\n{result}")

    return SongSection.from_llm_format(
        text=result, name=markup_section.name, length=markup_section.number_bars
    )


if __name__ == "__main__":
    from dotenv import dotenv_values

    assert Bar.example() == Bar.example()
    assert Bar.from_keypairs(Bar.example().to_keypairs()) == Bar.example()
    assert Bar.from_llm_format(Bar.example().to_llm_format()) == Bar.example()

    config = Config(**dotenv_values())  # type: ignore
    llm = ChatOpenAI(
        openai_api_key=config.openai_api_key, model="gpt-4", temperature=0.1
    )

    sections = {
        "Intro": MarkupSection(
            number_bars=8,
            name="Intro",
            instruments={
                "Pad": MarkupInstrument(
                    description="The pad will begin the track, holding a sustained chord to build into the rest of the track.",
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
            name="verse-1",
            instruments={
                "Pad": MarkupInstrument(
                    description="The pad will continue from the intro, playing sustained chord progressions that provide the track's harmonic backbone. Some chords will be held for longer periods to add tension.",
                    dependencies=["intro"],
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
            name="Chorus",
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
            name="verse-2",
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
            name="Outro",
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
    result = Song()
    for section in sections:
        generated_section = generate_section(
            markup_section=sections[section], prev_gens=result, llm=llm
        )
        result.append_section(generated_section)

    logger.info(f"Generated song:\n{result}")

# store previouss sections stuff -> keep running total of previous sections that can be referenced
# section_names = list(sections.keys())
