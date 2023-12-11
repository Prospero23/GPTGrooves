from collections import defaultdict

import dateutil.parser
from bson.raw_bson import RawBSONDocument
from pymongo import MongoClient
from pymongo.server_api import ServerApi

from music_generator.music_generator_types.base_song_types import Config
from music_generator.utilities.logs import get_logger
from music_generator.utilities.set_langchain_environment import (
    set_langchain_environment,
)

logger = get_logger(__name__)


def delete_except_last_song_per_day(config: Config) -> int:
    """
    Deletes all but the last song on each day.

    :returns: The number of deleted records.
    """
    client = MongoClient(
        config.atlas_cluster_uri,
        server_api=ServerApi("1"),
        document_class=RawBSONDocument,
    )
    db = client.get_database(config.db_name)
    collection = db.get_collection("songs")

    # Fetch all records
    songs = list(collection.find({}))

    # Group songs by date
    grouped_songs = defaultdict(list)
    for song in songs:
        date = dateutil.parser.parse(song["created_at_utc"]).date()
        grouped_songs[date].append(song)

    # Identify songs to delete (all but the last song of each day)
    songs_to_delete = []
    for date, song_list in grouped_songs.items():
        sorted_songs = sorted(
            song_list, key=lambda x: dateutil.parser.parse(x["created_at_utc"])
        )
        songs_to_delete.extend(sorted_songs[:-1])  # All but the last song

    print(
        "Deleting the following dates: "
        + "\n".join([x["created_at_utc"] for x in songs_to_delete])
    )
    # Delete the identified songs
    deleted_count = 0
    for song in songs_to_delete:
        collection.delete_one({"_id": song["_id"]})
        deleted_count += 1
    return deleted_count


if __name__ == "__main__":
    from dotenv import dotenv_values

    config = Config(**dotenv_values())  # type: ignore
    set_langchain_environment(config=config)
    # langchain.llm_cache = (
    #     SQLiteCache(database_path=config.llm_cache_filename)
    #     if config.llm_cache_filename
    #     else None
    # )
    count = delete_except_last_song_per_day(config)
    print(f"Deleted {count} future dated songs.")
