terraform {
  required_version = ">= 1.5.5"
}

variable "territory" {
  description = "The name of the territory. This is used to create the user's username."
  type        = string
}

variable "environment" {
  description = "The environment of the service. This is used to create the user's username."
  type        = string
}

# AWS
variable "aws_access_key_id" {
  description = "The AWS access key ID."
  type        = string
}

variable "aws_secret_access_key" {
  description = "The AWS secret access key."
  type        = string
}

variable "aws_region" {
  description = "The region to use for AWS resources."
  type        = string
}

# Vercel
variable "vercel_team" {
  description = "The Vercel team to use for the app."
  type        = string
}

variable "vercel_api_token" {
  description = "The vercel token to use for deploying the app."
  type        = string
}

# Github
variable "github_api_token" {
  description = "The github api token."
  type        = string
}


# Application
variable "openai_api_key" {
  type        = string
  description = "OpenAI API key"
}

variable "anyscale_api_token" {
  type        = string
  description = "Anyscale API token"
}

variable "music_generator_cron_schedule" {
  type        = string
  description = "The cron schedule for the music generator lambda function"
}

variable "atlas_cluster_uri" {
  type        = string
  description = "The URI of the Atlas cluster"
}

variable "music_generator_image_uri" {
  type        = string
  description = "The URI of the image to use for the music geneator lambda function"
}

variable "langchain_api_key" {
  type        = string
  description = "The API key for the langchain service"
}

variable "langchain_project" {
  type        = string
  description = "The project for the langchain service"
}
