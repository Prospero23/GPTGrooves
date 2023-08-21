
data "aws_iam_policy_document" "get_secrets_policy" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [resource.aws_secretsmanager_secret.secrets.arn]
    effect    = "Allow"
  }
}
