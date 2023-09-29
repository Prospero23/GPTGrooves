import json
import os

from boto3.session import Session
from botocore.exceptions import ClientError
from mypy_boto3_secretsmanager.client import SecretsManagerClient
from music_generator.workflows.daily_generate_song import (
    daily_generate_song_and_persist,
)

from music_generator.music_generator_types import Config
from music_generator.utilities.logs import get_logger

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


def configure_lambda() -> Config:
    logger.info("Generating configuration using Lambda context...")
    secret_id = os.environ["SECRETS_MANAGER_SECRET_ID"]
    region = os.environ["AWS_REGION"]
    logger.info(f"AWS Region is: {region}. Secrets stored at {secret_id}.")
    session = Session()
    secrets = get_secret(session=session, secret_id=secret_id, region_name=region)
    config = Config(**secrets)
    return config


def configure_local() -> Config:
    from dotenv import dotenv_values

    logger.info("Generating configuration using `.env`...")
    config = Config(**dotenv_values())  # type: ignore
    return config


def handler(event, context):  # type: ignore
    try:
        config = configure_lambda()
    except KeyError:
        logger.info("Lambda environment setup failed. Opting for local.")
        config = configure_local()

    daily_generate_song_and_persist(config=config)

    return {
        "statusCode": 200,
        "body": "Worked.",
    }


if __name__ == "__main__":
    print(handler({}, {}))
