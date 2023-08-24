
data "aws_iam_policy_document" "get_secrets_policy" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [resource.aws_secretsmanager_secret.secrets.arn]
    effect    = "Allow"
  }
}


data "aws_iam_policy_document" "read_write_policy" {
  statement {
    actions = [
      "dynamodb:BatchGetItem",
      "dynamodb:DescribeTable",
      "dynamodb:GetItem",
      "dynamodb:ListTables",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:ConditionCheckItem",
      "dynamodb:DeleteItem",
      "dynamodb:DescribeTable",
      "dynamodb:GetItem",
      "dynamodb:ListTables",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:UpdateItem",
      "dynamodb:UpdateTable",
      "dynamodb:DescribeLimits"
    ]

    resources = [
      var.sequence_table_arn
    ]

    effect = "Allow"
  }
}
