# SQS Queue for Prize Distribution
resource "aws_sqs_queue" "main" {
  name                       = var.queue_name
  visibility_timeout_seconds = var.visibility_timeout
  message_retention_seconds  = var.message_retention
  max_message_size          = var.max_message_size
  delay_seconds             = 0
  receive_wait_time_seconds = var.receive_wait_time

  # Dead Letter Queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  # Enable server-side encryption
  sqs_managed_sse_enabled = true

  tags = merge(
    var.tags,
    {
      Name = var.queue_name
    }
  )
}

# Dead Letter Queue
resource "aws_sqs_queue" "dlq" {
  name                       = "${var.queue_name}-dlq"
  message_retention_seconds  = var.dlq_message_retention
  sqs_managed_sse_enabled    = true

  tags = merge(
    var.tags,
    {
      Name = "${var.queue_name}-dlq"
    }
  )
}

# IAM Policy for Queue Access
resource "aws_iam_policy" "queue_consumer" {
  name        = "${var.queue_name}-consumer-policy"
  description = "Allow consuming messages from ${var.queue_name}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = [
          aws_sqs_queue.main.arn
        ]
      }
    ]
  })

  tags = var.tags
}

# IAM Policy for Queue Producer (Discord Bot)
resource "aws_iam_policy" "queue_producer" {
  name        = "${var.queue_name}-producer-policy"
  description = "Allow sending messages to ${var.queue_name}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = [
          aws_sqs_queue.main.arn
        ]
      }
    ]
  })

  tags = var.tags
}

# CloudWatch Alarms for DLQ
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "${var.queue_name}-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300 # 5 minutes
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "Alert when messages are in the DLQ for ${var.queue_name}"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.dlq.name
  }

  tags = var.tags
}
