from datetime import datetime, time, timedelta, timezone

import dateutil.parser
from bson.raw_bson import RawBSONDocument
from pymongo import MongoClient
from pymongo.server_api import ServerApi

from music_generator.music_generator_types.base_song_types import Config
from music_generator.utilities.logs import get_logger
from music_generator.utilities.set_langchain_environment import (
    set_langchain_environment,
)
from music_generator.workflows.daily_generate_song import (
    daily_generate_song_and_persist,
)

logger = get_logger(__name__)


def fill_missing_songs(config: Config, num_days: int = 14):
    """
    Iterates over the last two weeks and calls create_song(date) on every date
    that doesn't have a song for it.
    """
    client = MongoClient(
        config.atlas_cluster_uri,
        server_api=ServerApi("1"),
        document_class=RawBSONDocument,
    )
    db = client.get_database(config.db_name)
    collection = db.get_collection("songs")

    # Calculate the date range for the last two weeks
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=num_days)

    # Fetch all records in the last two weeks
    query = {
        "created_at_utc": {"$gte": start_date.isoformat(), "$lte": end_date.isoformat()}
    }
    songs = list(collection.find(query))

    # Group songs by date
    existing_dates = set()
    for song in songs:
        date = dateutil.parser.parse(song["created_at_utc"]).date()
        existing_dates.add(date)

    queue = []
    for single_date in (start_date + timedelta(n) for n in range(num_days)):
        if single_date not in existing_dates:
            datetime_object = datetime.combine(
                single_date, time(12, 0, 0, tzinfo=timezone.utc)
            )
            queue.append(datetime_object)
    print("Will create songs for dates:\n" + "\n".join([x.isoformat() for x in queue]))

    count = 0
    # Check each date in the range
    for d in queue:
        daily_generate_song_and_persist(config=config, d=d)
        count += 1

    return count


if __name__ == "__main__":
    from dotenv import dotenv_values

    config = Config(**dotenv_values())  # type: ignore
    set_langchain_environment(config=config)
    # langchain.llm_cache = (
    #     SQLiteCache(database_path=config.llm_cache_filename)
    #     if config.llm_cache_filename
    #     else None
    # )
    count = fill_missing_songs(config=config, num_days=28)
    print(f"Created {count} backdated songs.")
