terraform {
  required_version = ">= 1.5.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.11.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "0.15.0"
    }
  }
  cloud {
    organization = "kevcmk"
    hostname     = "app.terraform.io" # Optional; defaults to app.terraform.io
    workspaces {
      tags = ["territory:gpt-music-theorist"]
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team
}

provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key_id
  secret_key = var.aws_secret_access_key
}

locals {
  db_name = "music_theorist_${var.environment}"
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

  openai_api_key                = var.openai_api_key
  anyscale_api_token            = var.anyscale_api_token
  music_generator_cron_schedule = var.music_generator_cron_schedule
  atlas_cluster_uri             = var.atlas_cluster_uri
  image_uri                     = var.music_generator_image_uri
  db_name                       = local.db_name
}


module "vercel_deployment" {
  source = "git::ssh://git@github.com/kevcmk/terraform-katz.git//modules/vercel-deployment"

  territory             = var.territory
  environment           = var.environment
  aws_access_key_id     = var.aws_access_key_id
  aws_secret_access_key = var.aws_secret_access_key
  vercel_api_token      = var.vercel_api_token

  vercel_team = var.vercel_team
  # github_project = var.github_project
  aws_region = var.aws_region

  github_api_token = var.github_api_token
}

data "terraform_remote_state" "vercel_project" {
  backend = "remote"
  config = {
    organization = "kevcmk"
    workspaces = {
      name = "${var.territory}-vercel"
    }
  }
}

resource "vercel_project_environment_variable" "environment_atlas_cluster_uri" {
  project_id = data.terraform_remote_state.vercel_project.outputs.vercel_project_id
  target     = [module.vercel_deployment.vercel_environment_name]
  key        = "ATLAS_CLUSTER_URI"
  value      = var.atlas_cluster_uri
}

resource "vercel_project_environment_variable" "environment_db_name" {
  project_id = data.terraform_remote_state.vercel_project.outputs.vercel_project_id
  target     = [module.vercel_deployment.vercel_environment_name]
  key        = "DB_NAME"
  value      = local.db_name
}
