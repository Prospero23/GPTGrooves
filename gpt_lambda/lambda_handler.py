import json
import os
import sys


from boto3.session import Session
from botocore.exceptions import ClientError

# TODO Remove this?
sys.path.append(os.path.join(os.path.dirname(__file__)))
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))
sys.stderr.write("PATH")
sys.stderr.write(",".join(sys.path))
sys.stderr.write("\n")

from ta.utilities.logs import get_logger  # noqa: E402

logger = get_logger(__name__)


def get_secret(session: Session, secret_id: str, region_name: str) -> dict[str, str]:
    # Create a Secrets Manager client
    client = session.client(service_name="secretsmanager", region_name=region_name)

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


def handler(event, context):
    secret_id = os.environ["SECRETS_MANAGER_SECRET_ID"]
    region = os.environ["AWS_REGION"]
    print(f"Region is: {region}. Secrets stored at {secret_id}.")

    session = Session()

    secrets = get_secret(session=session, secret_id=secret_id, region_name=region)
    openai_api_key = secrets["openai_api_key"]

    print(f"Secret: ${openai_api_key[-5:]}")

    return {
        "statusCode": 200,
        "body": "Worked.",
    }


if __name__ == "__main__":
    print(handler({}, {}))
