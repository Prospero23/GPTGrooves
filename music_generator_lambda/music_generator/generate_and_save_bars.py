import datetime

import langchain
from langchain import OpenAI
from langchain.cache import SQLiteCache
from langchain.chat_models import ChatOpenAI

from lambda_handler import insert_bar
from music_generator.generator import generate_bar, logger
from music_generator.music_generator_types import BarRecord, Config


def generate_and_save_bars(config: Config) -> None:
    # We can do the same thing with a SQLite cache

    langchain.llm_cache = SQLiteCache(database_path="langchain.db")
    llms = [
        ChatOpenAI(openai_api_key=config.openai_api_key, model="gpt-4", cache=True),
        OpenAI(
            openai_api_key=config.openai_api_key, model="text-davinci-003", cache=True
        ),
    ]
    for llm in llms:
        bar = generate_bar(config=config, llm=llm)  # type: ignore
        insert_bar(
            config=config,
            bar_record=BarRecord(
                bar=bar,
                model=llm.model,
                created_at_utc=datetime.datetime.utcnow().isoformat(),
            ),
        )
        logger.info(f"Generated Bar with {llm.model}:\n{bar}")
