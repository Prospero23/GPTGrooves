from typing import Union
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

from music_generator.music_generator_types import Config, MusicalMarkup
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

any mention of a section should be formatted like %verse-1
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
            prompt="""Create an outline for a house music track using only the following elements:
                    -Pad
                    -Bass
                    -Drums: consisting of snare, kick, and hi-hat
                Provide a detailed and complete description of how each instrument will evolve throughout the track. Avoid mentioning any effects or filters and focus on complete descriptions of rhythm, harmony, and melody.
                Whenever referring to previous material, refer to sections.""",  # Make sure to include guide for dynamics? maybe 'provide literal musical material' or something of the sort
            # TODO prompt still references things like Main material. Also for parsing, good to pass previous drum part in always?
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

    return MusicalMarkup.from_outline(result)
    # return result


if __name__ == "__main__":
    from dotenv import dotenv_values

    config = Config(**dotenv_values())  # type: ignore
    llm = ChatOpenAI(
        openai_api_key=config.openai_api_key, model="gpt-4", temperature=0.90
    )
    markup = generate_markup(config=config, llm=llm)
    logger.info(f"RESULT: {markup}")
