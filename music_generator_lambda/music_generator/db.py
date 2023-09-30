from decimal import Decimal
from music_generator.music_generator_types import Config, SongRecord


from bson.raw_bson import RawBSONDocument
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

from bson.codec_options import TypeCodec
from bson.codec_options import TypeRegistry
from bson.codec_options import CodecOptions


# Custom Type Example https://pymongo.readthedocs.io/en/stable/examples/custom_type.html
class DecimalCodec(TypeCodec):
    python_type = Decimal  # type: ignore # the Python type acted upon by this type codec
    bson_type = float  # type: ignore # the BSON type acted upon by this type codec

    def transform_python(self, value):
        """Function that transforms a custom type value into a type
        that BSON can encode."""
        return float(value)

    def transform_bson(self, value):
        """Function that transforms a vanilla BSON type value into our
        custom type."""
        return Decimal(value).quantize(Decimal("0.00"))


decimal_codec = DecimalCodec()
type_registry = TypeRegistry([decimal_codec])
codec_options = CodecOptions(type_registry=type_registry)


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
    collection = db.get_collection("songs", codec_options=codec_options)
    inserted = collection.insert_one(song_record.dict())  # type:ignore
    return str(inserted.inserted_id)  # type: ignore
