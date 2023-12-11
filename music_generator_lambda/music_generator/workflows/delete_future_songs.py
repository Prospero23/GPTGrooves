from datetime import datetime, timezone

from bson.raw_bson import RawBSONDocument
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

from music_generator.music_generator_types.base_song_types import Config
from music_generator.utilities.logs import get_logger
from music_generator.utilities.set_langchain_environment import (
    set_langchain_environment,
)

logger = get_logger(__name__)


def delete_future_dated_songs(config: Config) -> int:
    """
    Deletes all songs with a created_at_utc date in the future.

    :returns: The number of deleted records.
    """
    client = MongoClient(
        config.atlas_cluster_uri,
        server_api=ServerApi("1"),
        document_class=RawBSONDocument,
    )
    db = client.get_database(config.db_name)
    collection = db.get_collection("songs")

    # Current UTC time
    now_utc = datetime.now(timezone.utc)

    # Query to find records with a future date
    query = {"created_at_utc": {"$gt": now_utc.isoformat()}}

    # Delete matching records
    result = collection.delete_many(query)
    return result.deleted_count


if __name__ == "__main__":
    from dotenv import dotenv_values

    config = Config(**dotenv_values())  # type: ignore
    set_langchain_environment(config=config)
    # langchain.llm_cache = (
    #     SQLiteCache(database_path=config.llm_cache_filename)
    #     if config.llm_cache_filename
    #     else None
    # )
    count = delete_future_dated_songs(config)
    print(f"Deleted {count} future dated songs.")
