from music_generator.music_generator_types.base_song_types import Config, SongRecord


from bson.raw_bson import RawBSONDocument
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi


def insert_song(config: Config, song_record: SongRecord) -> str:
    """
    :returns: The ID of the inserted record.
    """
    client = MongoClient(  # type: ignore
        config.atlas_cluster_uri,
        server_api=ServerApi("1"),
        document_class=RawBSONDocument,
    )
    db = client.get_database(config.db_name)
    collection = db.get_collection("songs")
    inserted = collection.insert_one(song_record.dict())  # type:ignore
    return str(inserted.inserted_id)  # type: ignore
