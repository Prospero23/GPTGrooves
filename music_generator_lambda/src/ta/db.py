from ta.ta_types import TaConfig, TaSuggestedResponse
from ta.utilities.logs import get_logger
from datetime import datetime
import botocore
from langchain.docstore.document import Document
from boto3.dynamodb.conditions import Key
from mypy_boto3_dynamodb.service_resource import Table


logger = get_logger(__name__)


def get_table(config: TaConfig) -> Table:
    dynamodb = config.aws_session.resource("dynamodb")

    # Replace 'MyTable' with your DynamoDB table name
    table = dynamodb.Table(config.aws_dynamodb_table_name)
    return table


def put_suggested_response(
    config: TaConfig, ta_suggested_response: TaSuggestedResponse
) -> None:
    logger.info(f"Putting {ta_suggested_response.question_reply_id}")

    table = get_table(config)

    # JSON response to put into DynamoDB
    item = {
        "Id": str(ta_suggested_response.question_reply_id),
        "QuestionId": ta_suggested_response.question_reply_id.question_id,
        "ReplyId": ta_suggested_response.question_reply_id.reply_id,
        "SuggestedResponse": ta_suggested_response.response,
        "SourceDocuments": [
            {"PageContent": source.page_content, "Metadata": source.metadata}
            for source in ta_suggested_response.source_documents
        ],
        "CreatedAt": ta_suggested_response.created_at_utc.isoformat(),  # Convert to Epoch for sorting
    }

    # Insert the JSON response into DynamoDB
    table.put_item(Item=item)


class NotFoundError(Exception):
    pass


def get_suggested_response(
    config: TaConfig, question_reply_id: str
) -> TaSuggestedResponse:
    table = get_table(config)

    try:
        # Try to retrieve the item from DynamoDB
        # response = table.get_item(Key={"Id": question_reply_id})
        response = table.query(
            KeyConditionExpression=Key("Id").eq(
                question_reply_id
            ),  # replace 'your-id' with the actual id
            ScanIndexForward=False,  # set to False for descending order
            Limit=1,
        )
    except botocore.exceptions.ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            raise NotFoundError(
                f"AWS Returned ResourceNotFoundException for {question_reply_id}"
            )
        raise e

    items = response["Items"]

    try:
        item = items[0]
    except IndexError:
        raise NotFoundError(
            f"No {question_reply_id} found in {config.aws_dynamodb_table_name}"
        )

    return TaSuggestedResponse(
        question_reply_id=question_reply_id,
        source_documents=item["SourceDocuments"],
        response=[
            Document(page_content=source["PageContent"], metadata=source["Metadata"])
            for source in item["SourceDocuments"]
        ],
        created_at_utc=datetime.fromisoformat(item["CreatedAt"]),
    )
