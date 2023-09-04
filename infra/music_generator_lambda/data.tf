terraform {
  required_version = ">= 1.5.5"
}

data "aws_iam_policy_document" "get_secrets_policy" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [resource.aws_secretsmanager_secret.secrets.arn]
    effect    = "Allow"
  }
}

data "aws_iam_policy_document" "lambda_logging" {
  statement {
    actions = [
      # TODO Do we need CreateLogGroup/Stream if we create in terraform?
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    effect = "Allow"

    resources = ["arn:aws:logs:*:*:*"] #tfsec:ignore:aws-iam-no-policy-wildcards
    # resources = [aws_cloudwatch_log_group.this.arn]
  }
}

data "aws_iam_policy_document" "assume_role_policy" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}
