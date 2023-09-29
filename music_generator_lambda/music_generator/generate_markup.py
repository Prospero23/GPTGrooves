import logging
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
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
)
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from music_generator.music_generator_types import Config, MusicalMarkup
from music_generator.utilities.logs import get_logger

logger = get_logger(__name__)


@retry(
    before_sleep=before_sleep_log(logger, logging.INFO),  # noqa: F821
    retry=(
        retry_if_exception_type(ValidationError) | retry_if_exception_type(ValueError)
    ),
    stop=stop_after_attempt(3),
)
def generate_markup(
    song_description: str, llm: Union[BaseChatModel, BaseLLM]
) -> MusicalMarkup:
    format_instructions = """You are generating songs in a musical markup language.

A song consists of a number of sections.

A section should be formatted as follows:

##section-name (number of bars)
*Pad - detailed description of the synth pad will do in this section
*Bass - detailed description of what the bass will do in this section
*Drums - detailed description of what the drums will do in section. Reference only "snare", "kick", and "hi-hat"
*Effects - detailed description of what the effects will do in this section. Reference only "reverb" and "delay"

If one section mentions another, then format that reference: %verse-1

Do not mention any other instruments or any effects other than "reverb" and "delay".

Provide a detailed and complete description of how each instrument will evolve throughout the track.

Whenever referring to previous material, refer to sections.
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
                HumanMessagePromptTemplate.from_template(
                    "Generate a song with the following description: {song_description}"
                ),
            ]
        )
        _input = chat_prompt_template.format_messages(
            format_instructions=format_instructions,
            song_description=song_description,  # Make sure to include guide for dynamics? maybe 'provide literal musical material' or something of the sort
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
        openai_api_key=config.openai_api_key,
        model="gpt-4",
        temperature=0.1,
        streaming=True,
        callbacks=[StreamingStdOutCallbackHandler()],
    )
    markup = generate_markup(song_description="A house song.", llm=llm)
    logger.info(f"RESULT: {markup}")
