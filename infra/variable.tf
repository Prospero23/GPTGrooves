terraform {
  required_version = ">= 1.5.5"
}

# Meta

variable "aws_region" {
  description = "The region to use for AWS resources."
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

variable "territory" {
  description = "The name of the territory. This is used to create the user's username."
  type        = string
}

variable "environment" {
  description = "The environment of the service. This is used to create the user's username."
  type        = string
}


# Application
variable "openai_api_key" {
  type        = string
  description = "OpenAI API key"
}
