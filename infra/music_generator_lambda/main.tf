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
  secret_name = "${var.territory}-${var.environment}-lambda-secret"
  lambda_root = "${path.module}/../../music_generator_lambda"
}

resource "aws_secretsmanager_secret" "secrets" { #tfsec:ignore:aws-ssm-secret-use-customer-key
  name        = local.secret_name
  description = "Secrets for the GPT Music Theorist Lambda function."
}

resource "aws_secretsmanager_secret_version" "secrets" {
  secret_id = aws_secretsmanager_secret.secrets.id
  secret_string = jsonencode({
    openai_api_key    = var.openai_api_key
    atlas_cluster_uri = var.atlas_cluster_uri
  })
}

resource "aws_iam_policy" "get_secrets_policy" {
  name   = "${var.territory}-${var.environment}-gpt-music-theorist-lambda-get-secrets-policy"
  path   = "/${var.territory}/${var.environment}/"
  policy = data.aws_iam_policy_document.get_secrets_policy.json
}

module "lambda_function" {
  # https://registry.terraform.io/modules/terraform-aws-modules/lambda/aws/latest

  source  = "terraform-aws-modules/lambda/aws"
  version = "6.0.0"

  function_name = "${var.territory}-${var.environment}-gpt-lambda"

  build_in_docker   = true
  docker_file       = "${local.lambda_root}/Dockerfile"
  docker_build_root = local.lambda_root
  docker_image      = "public.ecr.aws/sam/build-python3.9"
  runtime           = "python3.9"
  architectures     = ["arm64"]

  # This does not work with Terraform Cloud
  source_path = [
    {
      path = local.lambda_root
      patterns = [
        # The .*/.* indicates 1-or-more levels of directory.
        "!.*\\.pyc",
        "!.*/.*\\.pyc",
        "!__pycache__",
        "!.*/__pycache__",
      ]
      pip_requirements = "${local.lambda_root}/requirements.txt"
    }
  ]

  handler = "lambda_handler.handler"
  timeout = 900

  # TODO Optimize
  memory_size = 4096
  publish     = true

  description = "Do smart stuff with GPT."

  tracing_mode = "Active"

  #   allowed_triggers = {
  #     OneRule = {
  #       principal  = "events.amazonaws.com"
  #       source_arn = local.eventbridge_cron_arns
  #     },
  #   }

  environment_variables = {
    SECRETS_MANAGER_SECRET_ID = local.secret_name,
    PYTHON_LOG_LEVEL          = "DEBUG",
    ATLAS_CLUSTER_URI         = var.atlas_cluster_uri,
  }

  attach_policies = true
  policies = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    aws_iam_policy.get_secrets_policy.arn,
  ]
  number_of_policies = 2

  # use_existing_cloudwatch_log_group = true
  cloudwatch_logs_retention_in_days = 365

}

resource "aws_cloudwatch_event_rule" "this" {
  count               = var.music_generator_cron_schedule == "" ? 0 : 1
  name                = module.lambda_function.lambda_function_name
  description         = "Trigger Music Generator at interval"
  schedule_expression = var.music_generator_cron_schedule
  # schedule_expression = var.music_generator_cron_schedule == "" ? "rate(1 hour)" : var.music_generator_cron_schedule
}

resource "aws_cloudwatch_event_target" "this" {
  count = var.music_generator_cron_schedule == "" ? 0 : 1
  rule  = aws_cloudwatch_event_rule.this[0].name
  arn   = module.lambda_function.lambda_function_arn
  input = jsonencode({ "job" : "cron-by-rate" })
}

resource "aws_lambda_permission" "this" {
  count         = var.music_generator_cron_schedule == "" ? 0 : 1
  function_name = module.lambda_function.lambda_function_name
  principal     = "events.amazonaws.com"
  action        = "lambda:InvokeFunction"
  source_arn    = aws_cloudwatch_event_rule.this[0].arn
}
