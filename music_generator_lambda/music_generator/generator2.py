from typing import Union
from langchain import PromptTemplate
from langchain.callbacks import get_openai_callback
from langchain.chat_models import ChatOpenAI

# from langchain.schema.language_model import BaseChatModel
from langchain.chat_models.base import BaseChatModel
from langchain.llms.base import BaseLLM
from langchain.prompts import ChatPromptTemplate
from langchain.prompts.chat import HumanMessagePromptTemplate, SystemMessage
from pydantic import ValidationError
from tenacity import retry, retry_if_exception_type, stop_after_attempt

from music_generator.music_generator_types import Bar, Config
from music_generator.utilities.logs import get_logger

logger = get_logger(__name__)


@retry(
    retry=(
        retry_if_exception_type(ValidationError) | retry_if_exception_type(ValueError)
    ),
    stop=stop_after_attempt(3),
)
def generate_bars(config: Config, llm: Union[BaseChatModel, BaseLLM]) -> list[Bar]:
    format_instructions = f"""Your format should be an instrument followed by sixteenth notes, separated by spaces.

Your output should be wrapped in {{{{{{ and }}}}}} for each bar for me to extract.

The music should be formatted as follows:

{Bar.example().to_llm_format()}
"""
    if isinstance(llm, BaseLLM):
        prompt_template: PromptTemplate = PromptTemplate.from_template(
            "Answer the user query.\n{format_instructions}\n{prompt}"
        )
        _input = prompt_template.format(
            format_instructions=format_instructions,
            prompt="Generate a four bar intro to a house song that uses hi-hat, kick, snare, bass, and pad. Don't use my pattern i provided",
        )
        logger.debug("Prompt:\n" + _input)

        with get_openai_callback() as cb:
            output = llm(_input)
        result = output
    else:
        chat_prompt_template: ChatPromptTemplate = ChatPromptTemplate.from_messages(
            [
                SystemMessage(content=f"Answer the user query.\n{format_instructions}"),
                HumanMessagePromptTemplate.from_template("{prompt}"),
            ]
        )
        _input = chat_prompt_template.format_messages(
            format_instructions=format_instructions,
            prompt="Generate a four bar intro to a house song that uses hi-hat, kick, snare, bass, and pad. Don't use my pattern i provided",
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

    # Parsing the result to get the list of X bars
    bars_strings = result.split("}}}")
    deserialized_bars = [
        Bar.from_llm_format(bar_string + "}}}")
        for bar_string in bars_strings
        if bar_string
    ]

    return deserialized_bars


if __name__ == "__main__":
    from dotenv import dotenv_values

    assert Bar.example() == Bar.example()
    assert Bar.from_keypairs(Bar.example().to_keypairs()) == Bar.example()
    assert Bar.from_llm_format(Bar.example().to_llm_format()) == Bar.example()
    config = Config(**dotenv_values())  # type: ignore
    llm = ChatOpenAI(openai_api_key=config.openai_api_key, model="gpt-4")
    bars = generate_bars(config=config, llm=llm)
    for index, bar in enumerate(bars):
        logger.info(f"Generated Bar {index+1}:\n{bar} \nNumber of Bars:{len(bars)}")
