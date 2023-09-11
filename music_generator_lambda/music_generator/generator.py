from langchain import PromptTemplate
from langchain.callbacks import get_openai_callback

# from langchain.schema.language_model import BaseChatModel
from langchain.chat_models.base import BaseChatModel
from langchain.llms.base import BaseLLM
from langchain.prompts import ChatPromptTemplate
from langchain.prompts.chat import HumanMessagePromptTemplate, SystemMessage

from music_generator.generate_and_save_bars import generate_and_save_bars
from music_generator.music_generator_types import Bar, Config
from music_generator.utilities.logs import get_logger

logger = get_logger(__name__)


def generate_bar(config: Config, llm: BaseChatModel | BaseLLM) -> Bar:
    # model_name = "text-davinci-003"
    # temperature = 0.0
    # model = OpenAI(model_name=model_name, temperature=temperature)

    # Set up a parser + inject instructions into the prompt template.

    # Note, {{ in an fstring produces a single {
    format_instructions = f"""Your format should be an instrument followed by sixteenth notes, separated by spaces.
Your output should be wrapped in {{{{{{ and }}}}}} for me to extract. The music should be formatted as follows:
{Bar.example().to_llm_format()}
"""
    if isinstance(llm, BaseLLM):
        # https://python.langchain.com/docs/modules/model_io/prompts/prompt_templates/#chat-prompt-template
        prompt_template: PromptTemplate = PromptTemplate.from_template(
            "Answer the user query.\n{format_instructions}\n{prompt}"
        )
        _input = prompt_template.format(
            prompt="Generate an interesting bar of a house song."
        )
        logger.debug("Prompt:\n" + _input)

        with get_openai_callback() as cb:
            output = llm(_input)
        result = output.content
    else:
        # https://python.langchain.com/docs/modules/model_io/prompts/prompt_templates/#chat-prompt-template
        chat_prompt_template: ChatPromptTemplate = ChatPromptTemplate.from_messages(  # pyright: ignore[reportUnknownMemberType]
            [
                SystemMessage(content=f"Answer the user query.\n{format_instructions}"),
                HumanMessagePromptTemplate.from_template("{prompt}"),
            ]
        )
        _input = chat_prompt_template.format_messages(
            prompt="Generate an interesting bar of a house song."
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

    assert Bar.example() == Bar.example()
    assert Bar.from_keypairs(Bar.example().to_keypairs()) == Bar.example()
    assert Bar.from_llm_format(Bar.example().to_llm_format()) == Bar.example()
    config = Config(**dotenv_values())  # type: ignore
    bar = generate_and_save_bars(
        config=config,
    )
    logger.info(f"Generated Bar:\n{bar}")
