import datetime
import json
import os

from boto3.session import Session
from botocore.exceptions import ClientError
from bson.raw_bson import RawBSONDocument
from mypy_boto3_secretsmanager.client import SecretsManagerClient
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

from music_generator.generator import Bar, generate_bar
from music_generator.music_generator_types import BarRecord, Config
from music_generator.utilities.logs import get_logger  # noqa: E402

logger = get_logger(__name__)


def get_secret(session: Session, secret_id: str, region_name: str) -> dict[str, str]:
    # Create a Secrets Manager client
    client: SecretsManagerClient = session.client(  # type: ignore
        service_name="secretsmanager", region_name=region_name
    )

    try:
        get_secret_value_response = client.get_secret_value(SecretId=secret_id)
    except ClientError as e:
        # For a list of exceptions thrown, see
        # https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
        raise e

    # Decrypts secret using the associated KMS key.
    secret_string = get_secret_value_response["SecretString"]
    secret = json.loads(secret_string)

    return secret


def ping_database(config: Config) -> None:
    # Create a new client and connect to the server
    client = MongoClient(
        config.atlas_cluster_uri,
        server_api=ServerApi("1"),
        document_class=RawBSONDocument,
    )
    # Send a ping to confirm a successful connection
    try:
        client.admin.command("ping")
        print("Pinged your deployment. You successfully connected to MongoDB!")
    except Exception as e:
        print(e)
        raise e


def insert_bar(config: Config, bar_record: BarRecord) -> str:
    """
    :returns: The ID of the inserted record.
    """
    client = MongoClient(  # type: ignore
        config.atlas_cluster_uri,
        server_api=ServerApi("1"),
        document_class=RawBSONDocument,
    )
    db = client.get_database(config.db_name)
    collection = db.get_collection("bars")
    inserted = collection.insert_one(bar_record.dict())  # type:ignore
    return str(inserted.inserted_id)  # type: ignore


def configure_lambda():
    secret_id = os.environ["SECRETS_MANAGER_SECRET_ID"]
    region = os.environ["AWS_REGION"]
    print(f"Region is: {region}. Secrets stored at {secret_id}.")

    session = Session()
    secrets = get_secret(session=session, secret_id=secret_id, region_name=region)
    # config = Config(
    #     openai_api_key=secrets["openai_api_key"],
    #     atlas_cluster_uri=secrets["atlas_cluster_uri"],
    # )
    config = Config(**secrets)
    return config, session


def configure_local():
    from dotenv import dotenv_values

    config = Config(**dotenv_values())  # type: ignore
    return config, None


def handler(event, context):  # type: ignore
    try:
        config, _ = configure_lambda()
    except KeyError:
        config, _ = configure_local()

    # Sanity checks # TODO Remove
    ping_database(config=config)
    assert Bar.example() == Bar.example()
    assert Bar.from_keypairs(Bar.example().to_keypairs()) == Bar.example()
    assert Bar.from_llm_format(Bar.example().to_llm_format()) == Bar.example()

    bar = generate_bar(config=config)  # type: ignore
    insert_bar(
        config=config,
        bar_record=BarRecord(
            bar=bar,
            created_at_utc=datetime.datetime.utcnow().isoformat(),
        ),
    )
    logger.info(f"Generated Bar:\n{bar}")

    return {
        "statusCode": 200,
        "body": "Worked.",
    }


if __name__ == "__main__":
    print(handler({}, {}))
