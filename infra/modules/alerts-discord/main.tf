terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

# CloudWatch alarms to a Discord channel: alarms notify the SNS topic, and a
# small Lambda (lambda/index.mjs) turns each notification into a Discord
# message. SNS cannot post to a Discord webhook by itself.

locals {
  name           = "${var.project_name}-${var.environment}-alerts-discord"
  parameter_name = "/${var.project_name}/${var.environment}/alerts-discord-webhook-url"
}

data "aws_region" "current" {}

data "aws_kms_key" "ssm" {
  key_id = "alias/aws/ssm"
}

resource "aws_sns_topic" "alerts" {
  name = local.name
  tags = var.tags
}

# The webhook URL works as a password. Terraform creates the parameter with a
# placeholder and never touches its value again; the real URL is put in by
# hand (DEPLOYMENT_GUIDE.md), so it is never in this repo or in an
# environment variable.
resource "aws_ssm_parameter" "webhook_url" {
  name        = local.parameter_name
  description = "Discord webhook URL that CloudWatch alarms are posted to"
  type        = "SecureString"
  value       = var.placeholder_value

  lifecycle {
    ignore_changes = [value]
  }

  tags = merge(var.tags, {
    Name           = local.parameter_name
    ValueManagedBy = "manual"
  })
}

data "archive_file" "lambda" {
  type = "zip"
  # The handler and alerts.json, each alarm's own message.
  source_dir  = "${path.module}/lambda"
  excludes    = ["index.test.mjs"]
  output_path = "${path.module}/.build/alerts-discord.zip"
}

data "aws_iam_policy_document" "assume_lambda" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = local.name
  assume_role_policy = data.aws_iam_policy_document.assume_lambda.json
  tags               = var.tags
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = 30
  tags              = var.tags
}

# Its own logs, and that one parameter: nothing else.
data "aws_iam_policy_document" "lambda" {
  statement {
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.lambda.arn}:*"]
  }

  statement {
    actions   = ["ssm:GetParameter"]
    resources = [aws_ssm_parameter.webhook_url.arn]
  }

  statement {
    actions   = ["kms:Decrypt"]
    resources = [data.aws_kms_key.ssm.arn]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${data.aws_region.current.name}.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "lambda" {
  name   = local.name
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda.json
}

resource "aws_lambda_function" "alerts" {
  function_name    = local.name
  description      = "Posts CloudWatch alarms to Discord"
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  memory_size      = 128
  timeout          = 10

  environment {
    variables = {
      # The parameter's name, not its value.
      WEBHOOK_URL_PARAMETER = aws_ssm_parameter.webhook_url.name
    }
  }

  depends_on = [aws_iam_role_policy.lambda, aws_cloudwatch_log_group.lambda]

  tags = var.tags
}

resource "aws_lambda_permission" "sns" {
  statement_id  = "AllowSnsInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.alerts.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.alerts.arn
}

resource "aws_sns_topic_subscription" "lambda" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.alerts.arn
}
