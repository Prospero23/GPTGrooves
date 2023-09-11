import datetime

import langchain
from langchain import OpenAI
from langchain.cache import SQLiteCache
from langchain.chat_models import ChatOpenAI
from music_generator.db import insert_bar

from music_generator.generator import generate_bar
from music_generator.music_generator_types import BarRecord, Config
from music_generator.utilities.logs import get_logger

logger = get_logger(__name__)


def generate_and_save_bars(config: Config) -> None:
    """
    Generate a bar using each of the LLMs and save them to the database.
    """

    langchain.llm_cache = (
        SQLiteCache(database_path="langchain.db") if config.llm_cache_filename else None
    )
    llms = [
        # LLama uses the ChatOpenAI API so we just override their api endpoint
        ChatOpenAI(
            openai_api_base="https://console.endpoints.anyscale.com/m/v1",
            openai_api_key=config.anyscale_api_token,
            model="meta-llama/Llama-2-70b-chat-hf",
        ),
        ChatOpenAI(
            openai_api_key=config.openai_api_key,
            model="gpt-4",
        ),
        OpenAI(
            openai_api_key=config.openai_api_key,
            model="text-davinci-003",
        ),
    ]
    for llm in llms:
        logger.debug(f"Generating Bar with {llm.model_name}...")
        bar = generate_bar(config=config, llm=llm)  # type: ignore
        insert_bar(
            config=config,
            bar_record=BarRecord(
                bar=bar,
                model=llm.model_name,
                created_at_utc=datetime.datetime.utcnow().isoformat(),
            ),
        )
        logger.info(f"Generated Bar with {llm.model_name}\n:{bar.to_keypairs()}")


if __name__ == "__main__":
    from dotenv import dotenv_values

    config = Config(**dotenv_values())  # type: ignore
    bar = generate_and_save_bars(
        config=config,
    )
