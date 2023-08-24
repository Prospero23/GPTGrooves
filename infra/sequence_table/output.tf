terraform {
  required_version = ">= 1.5.5"
}

output "dynamodb_table_name" {
  description = "Name of Contact DynamoDB table."
  value       = aws_dynamodb_table.dynamodb_table.name
}

output "dynamodb_table_arn" {
  description = "ARN of Contact DynamoDB table."
  value       = aws_dynamodb_table.dynamodb_table.arn
}
