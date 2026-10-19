output "topic_arn" {
  description = "SNS topic to put in an alarm's alarm_actions / ok_actions"
  value       = aws_sns_topic.alerts.arn
}

output "webhook_url_parameter_name" {
  description = "SSM parameter the Discord webhook URL is put in by hand"
  value       = aws_ssm_parameter.webhook_url.name
}
