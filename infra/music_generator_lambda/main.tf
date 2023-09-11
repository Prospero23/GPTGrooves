terraform {
  required_version = ">= 1.5.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.11.0"
    }
    # vercel = {
    #   source  = "vercel/vercel"
    #   version = "0.15.0"
    # }
  }
  cloud {
    organization = "kevcmk"
    hostname     = "app.terraform.io" # Optional; defaults to app.terraform.io
    workspaces {
      tags = ["territory:gpt-music-theorist"]
    }
  }
}

# provider "vercel" {
#   api_token = var.vercel_api_token
#   team      = var.vercel_team
# }


provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key_id
  secret_key = var.aws_secret_access_key
}

locals {
  secret_name          = "${var.territory}-${var.environment}-lambda-secret"
  lambda_function_name = "${var.territory}-${var.environment}-music-generator"
}

resource "aws_secretsmanager_secret" "secrets" { #tfsec:ignore:aws-ssm-secret-use-customer-key
  name        = local.secret_name
  description = "Secrets for the GPT Music Theorist Lambda function."
}

resource "aws_secretsmanager_secret_version" "secrets" {
  secret_id = aws_secretsmanager_secret.secrets.id
  secret_string = jsonencode({
    openai_api_key     = var.openai_api_key
    anyscale_api_token = var.anyscale_api_token
    atlas_cluster_uri  = var.atlas_cluster_uri
    db_name            = var.db_name
  })
}

resource "aws_iam_role" "lambda" {
  name               = "${var.territory}-${var.environment}-music-generator-lambda-role"
  path               = "/${var.territory}/${var.environment}/"
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy.json
}

# Policies

resource "aws_iam_policy" "lambda_logging" {
  name        = "${var.territory}-${var.environment}-music-generator-logging"
  path        = "/${var.territory}/${var.environment}/"
  description = "IAM policy for logging from a lambda"
  policy      = data.aws_iam_policy_document.lambda_logging.json
}

resource "aws_iam_policy" "get_secrets_policy" {
  name   = "${var.territory}-${var.environment}-music-generator-get-secrets-policy"
  path   = "/${var.territory}/${var.environment}/"
  policy = data.aws_iam_policy_document.get_secrets_policy.json
}

# Policy Attachments

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = aws_iam_policy.lambda_logging.arn
}

resource "aws_iam_role_policy_attachment" "get_secrets_policy" {
  role       = aws_iam_role.lambda.name
  policy_arn = aws_iam_policy.get_secrets_policy.arn
}

resource "aws_lambda_function" "this" {

  function_name = local.lambda_function_name
  role          = aws_iam_role.lambda.arn

  package_type = "Image"
  image_uri    = var.image_uri
  timeout      = 600

  # TODO Optimize
  memory_size = 1024
  publish     = true

  description = "Generate new music."

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      SECRETS_MANAGER_SECRET_ID = local.secret_name,
      PYTHON_LOG_LEVEL          = "DEBUG",
    }
  }

  depends_on = [
    aws_iam_role.lambda,
    aws_iam_policy.lambda_logging,
    aws_iam_policy.get_secrets_policy,
    aws_iam_role_policy_attachment.lambda_logs,
    aws_iam_role_policy_attachment.get_secrets_policy,
    aws_secretsmanager_secret_version.secrets,
  ]

}

resource "aws_cloudwatch_event_rule" "this" {
  count               = var.music_generator_cron_schedule == "" ? 0 : 1
  name                = aws_lambda_function.this.function_name
  description         = "Trigger Music Generator at interval"
  schedule_expression = var.music_generator_cron_schedule
  # schedule_expression = var.music_generator_cron_schedule == "" ? "rate(1 hour)" : var.music_generator_cron_schedule
}

resource "aws_cloudwatch_event_target" "this" {
  count = var.music_generator_cron_schedule == "" ? 0 : 1
  rule  = aws_cloudwatch_event_rule.this[0].name
  arn   = aws_lambda_function.this.arn
  input = jsonencode({ "job" : "cron-by-rate" })
}

resource "aws_lambda_permission" "this" {
  count         = var.music_generator_cron_schedule == "" ? 0 : 1
  function_name = aws_lambda_function.this.function_name
  principal     = "events.amazonaws.com"
  action        = "lambda:InvokeFunction"
  source_arn    = aws_cloudwatch_event_rule.this[0].arn
}
