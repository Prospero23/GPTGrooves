terraform {
  required_version = ">= 1.5.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.11.0"
    }
  }
}

provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key_id
  secret_key = var.aws_secret_access_key
}

resource "aws_dynamodb_table" "dynamodb_table" {
  name             = "${var.territory}-${var.environment}-sequence-table"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "id"
  range_key        = "created_at"
  stream_enabled   = true
  stream_view_type = "NEW_IMAGE"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  server_side_encryption { #tfsec:ignore:aws-dynamodb-table-customer-key
    enabled = false        #tfsec:ignore:aws-dynamodb-enable-at-rest-encryption
    # kms_key_arn = aws_kms_key.dynamo_db_kms.arn
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name        = "${var.territory}-${var.environment}-sequence-table"
    Territory   = var.territory
    Environment = var.environment
  }

}
