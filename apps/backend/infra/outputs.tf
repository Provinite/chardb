output "instance_id" {
  description = "ID of the EC2 instance"
  value       = module.backend_docker_host.instance_id
}

output "public_ip" {
  description = "Public IP address of the instance"
  value       = module.backend_docker_host.public_ip
}

output "public_dns" {
  description = "Public DNS name of the instance"
  value       = module.backend_docker_host.public_dns
}

output "private_ip" {
  description = "Private IP address of the instance"
  value       = module.backend_docker_host.private_ip
}


output "jaeger_url" {
  description = "Jaeger UI URL"
  value       = module.backend_docker_host.jaeger_url
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = module.backend_docker_host.ssh_command
}

output "ssh_private_key" {
  description = "Private SSH key for instance access (save this to a .pem file)"
  value       = module.backend_docker_host.ssh_private_key
  sensitive   = true
}

output "ssh_key_name" {
  description = "Name of the generated SSH key pair"
  value       = module.backend_docker_host.ssh_key_name
}

output "security_group_id" {
  description = "ID of the security group"
  value       = module.backend_docker_host.security_group_id
}

# CloudFront API outputs (when enabled)
output "cloudfront_api_url" {
  description = "CloudFront API URL (if enabled)"
  value       = var.enable_api_gateway ? module.cloudfront_api[0].api_url : ""
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (if enabled)"
  value       = var.enable_api_gateway ? module.cloudfront_api[0].cloudfront_distribution_id : ""
}

output "backend_url" {
  description = "Backend URL (CloudFront if enabled, otherwise direct EC2)"
  value = var.enable_api_gateway ? (
    var.api_custom_domain_name != "" ? 
    "https://${var.api_custom_domain_name}" : 
    module.cloudfront_api[0].api_url
  ) : "http://${module.backend_docker_host.public_dns}:${var.backend_port}"
}

output "db_password" {
  description = "Generated database password"
  value       = module.backend_docker_host.db_password
  sensitive   = true
}

output "jwt_secret" {
  description = "Generated JWT secret"
  value       = module.backend_docker_host.jwt_secret
  sensitive   = true
}

output "deviantart_client_id" {
  description = "DeviantArt OAuth client ID"
  value       = module.backend_docker_host.deviantart_client_id
  sensitive   = true
}

output "deviantart_client_secret" {
  description = "DeviantArt OAuth client secret"
  value       = module.backend_docker_host.deviantart_client_secret
  sensitive   = true
}

output "deviantart_callback_url" {
  description = "DeviantArt OAuth callback URL"
  value       = module.backend_docker_host.deviantart_callback_url
}

output "discord_client_id" {
  description = "Discord OAuth client ID"
  value       = module.backend_docker_host.discord_client_id
  sensitive   = true
}

output "discord_client_secret" {
  description = "Discord OAuth client secret"
  value       = module.backend_docker_host.discord_client_secret
  sensitive   = true
}

output "discord_callback_url" {
  description = "Discord OAuth callback URL"
  value       = module.backend_docker_host.discord_callback_url
}

output "discord_bot_token" {
  description = "Discord bot token for bot integration"
  value       = module.backend_docker_host.discord_bot_token
  sensitive   = true
}

# SQS Queue outputs
output "sqs_queue_url" {
  description = "URL of the prize distribution SQS queue"
  value       = module.prize_distribution_queue.queue_url
}

output "sqs_queue_arn" {
  description = "ARN of the prize distribution SQS queue"
  value       = module.prize_distribution_queue.queue_arn
}

output "sqs_dlq_url" {
  description = "URL of the prize distribution Dead Letter Queue"
  value       = module.prize_distribution_queue.dlq_url
}

output "sqs_consumer_policy_arn" {
  description = "ARN of the IAM policy for queue consumers"
  value       = module.prize_distribution_queue.consumer_policy_arn
}

output "sqs_producer_policy_arn" {
  description = "ARN of the IAM policy for queue producers (Discord bot)"
  value       = module.prize_distribution_queue.producer_policy_arn
}