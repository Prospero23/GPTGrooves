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

variable "music_generator_cron_schedule" {
  type        = string
  description = "The cron schedule for the music generator lambda function"
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

variable "atlas_cluster_uri" {
  type        = string
  description = "The URI of the Atlas cluster"
}

variable "db_name" {
  type        = string
  description = "The name of the database to use for the music generator lambda function"
}

variable "image_uri" {
  type        = string
  description = "The URI of the image to use for the lambda function"
}

variable "langchain_api_key" {
  type        = string
  description = "The API key for the langchain service"
}

variable "langchain_project" {
  type        = string
  description = "The project for the langchain service"
}
