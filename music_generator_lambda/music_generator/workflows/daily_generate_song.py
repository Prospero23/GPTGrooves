import datetime

import langchain
from langchain.cache import SQLiteCache
from langchain.chat_models import ChatOpenAI

from music_generator.db import insert_song
from music_generator.generate_markup import generate_markup
from music_generator.generate_section import generate_section
from music_generator.music_generator_types import Config, Song, SongRecord
from music_generator.utilities.logs import get_logger

logger = get_logger(__name__)


def daily_generate_song_and_persist(config: Config) -> None:
    """
    Generate a bar using each of the LLMs and save them to the database.
    """

    langchain.llm_cache = (
        SQLiteCache(database_path="langchain.db") if config.llm_cache_filename else None
    )
    llm = ChatOpenAI(
        openai_api_key=config.openai_api_key, model="gpt-4", temperature=0.90
    )

    markup = generate_markup(config=config, llm=llm)
    logger.info(f"Generated Markup:\n{markup}")

    sections = markup.sections

    result = Song()
    for section in sections:
        generated_section = generate_section(
            config=config, llm=llm, markup_section=sections[section], prev_gens=result
        )
        result.append_section(generated_section)
    insert_song(
        config=config,
        song_record=SongRecord(
            song=result, created_at_utc=datetime.datetime.utcnow().isoformat()
        ),
    )


if __name__ == "__main__":
    from dotenv import dotenv_values

    config = Config(**dotenv_values())  # type: ignore
    daily_generate_song_and_persist(config=config)
