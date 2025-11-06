output "queue_url" {
  description = "URL of the SQS queue"
  value       = aws_sqs_queue.main.url
}

output "queue_arn" {
  description = "ARN of the SQS queue"
  value       = aws_sqs_queue.main.arn
}

output "queue_name" {
  description = "Name of the SQS queue"
  value       = aws_sqs_queue.main.name
}

output "dlq_url" {
  description = "URL of the Dead Letter Queue"
  value       = aws_sqs_queue.dlq.url
}

output "dlq_arn" {
  description = "ARN of the Dead Letter Queue"
  value       = aws_sqs_queue.dlq.arn
}

output "dlq_name" {
  description = "Name of the Dead Letter Queue"
  value       = aws_sqs_queue.dlq.name
}

output "consumer_policy_arn" {
  description = "ARN of the IAM policy for queue consumers"
  value       = aws_iam_policy.queue_consumer.arn
}

output "producer_policy_arn" {
  description = "ARN of the IAM policy for queue producers (Discord bot)"
  value       = aws_iam_policy.queue_producer.arn
}
