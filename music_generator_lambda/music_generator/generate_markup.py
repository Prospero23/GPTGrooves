from typing import Union
from re import split
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

from music_generator.music_generator_types import Bar, Config, MusicalMarkup
from music_generator.utilities.logs import get_logger

logger = get_logger(__name__)


@retry(
    retry=(
        retry_if_exception_type(ValidationError) | retry_if_exception_type(ValueError)
    ),
    stop=stop_after_attempt(3),
)
def generate_markup(
    config: Config, llm: Union[BaseChatModel, BaseLLM]
) -> MusicalMarkup:
    format_instructions = """Your format should be a musical markup language.

The music should be formatted as follows:

##section name (number of bars)
*instrument1 - detailed description of what instrument1 will do in section
*instrument2 - detailed description of what instrument2 will do in section
"""

    result = ""
    # if llm

    if isinstance(llm, BaseLLM):
        logger.info("llm")
    # if chat model
    else:
        chat_prompt_template: ChatPromptTemplate = ChatPromptTemplate.from_messages(
            [
                SystemMessage(
                    content=f"Perform the following task.\n{format_instructions}"
                ),
                HumanMessagePromptTemplate.from_template("{prompt}"),
            ]
        )
        _input = chat_prompt_template.format_messages(
            format_instructions=format_instructions,
            prompt="""make me an outline for a house track using only pad, bass, and drums consisting of snare, kick, and hi-hat.
            Do not mention effects but provide how the material will develop. When referencing any previous material, always include the section as well. Be literal in your descriptions. """,
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

    # make sure that the output references sections explicitly so it can reference previous material in graph.

    return MusicalMarkup(text=result)


def parse_music_structure(text):
    # Split by section
    sections = split(r"##([A-Za-z\s]+)\s\((\d+ bars)\)", text)[1:]

    # Group section name and details
    grouped_sections = [
        (sections[i], sections[i + 1], sections[i + 2])
        for i in range(0, len(sections), 3)
    ]

    music_structure = {}

    for section, bars, details in grouped_sections:
        music_structure[section] = {"bars": bars, "details": {}}

        for line in details.strip().split("\n"):
            if "-" in line:
                instrument, info = line.split("-", 1)
                instrument = instrument.strip().strip("*")
                info = info.strip()
                music_structure[section]["details"][instrument] = info
            else:
                print(f"Unexpected line format: {line}")  # TODO actually handle this

    return music_structure


if __name__ == "__main__":
    from dotenv import dotenv_values

    assert Bar.example() == Bar.example()
    assert Bar.from_keypairs(Bar.example().to_keypairs()) == Bar.example()
    assert Bar.from_llm_format(Bar.example().to_llm_format()) == Bar.example()
    config = Config(**dotenv_values())  # type: ignore
    llm = ChatOpenAI(openai_api_key=config.openai_api_key, model="gpt-4")
    markup = generate_markup(config=config, llm=llm)
    # parsed_data = parse_music_structure(markup.text)
    # parsed_data_str = "\n".join(
    #     [f"{section} : {details}" for section, details in parsed_data.items()]
    # )
    # logger.info(f"RESULT: {parsed_data_str}")
    logger.info(f"RESULT: {markup.text}")


# logger.info
