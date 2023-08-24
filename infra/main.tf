terraform {
  required_version = ">= 1.5.5"

  cloud {
    organization = "kevcmk"
    hostname     = "app.terraform.io" # Optional; defaults to app.terraform.io
    workspaces {
      tags = ["territory:gpt-music-theorist"]
    }
  }
}


module "sequence_table" {
  source                = "./sequence_table"
  territory             = var.territory
  environment           = var.environment
  aws_access_key_id     = var.aws_access_key_id
  aws_secret_access_key = var.aws_secret_access_key
  aws_region            = var.aws_region
}

module "music_generator_lambda" {
  source                = "./music_generator_lambda"
  territory             = var.territory
  environment           = var.environment
  aws_access_key_id     = var.aws_access_key_id
  aws_secret_access_key = var.aws_secret_access_key
  aws_region            = var.aws_region

  openai_api_key      = var.openai_api_key
  sequence_table_name = module.sequence_table.dynamodb_table_name
  sequence_table_arn  = module.sequence_table.dynamodb_table_arn
}
