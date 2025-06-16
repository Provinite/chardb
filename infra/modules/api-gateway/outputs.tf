# $schema: https://raw.githubusercontent.com/hashicorp/terraform/main/schemas/providers/aws.json

output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = aws_api_gateway_stage.backend.invoke_url
}

output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = aws_api_gateway_rest_api.backend.id
}

output "api_gateway_arn" {
  description = "ARN of the API Gateway"
  value       = aws_api_gateway_rest_api.backend.arn
}

output "custom_domain_url" {
  description = "URL of the custom domain (if configured)"
  value       = var.custom_domain_name != "" ? "https://${var.custom_domain_name}" : ""
}

# VPC Link removed - using direct HTTP integration to EC2 public endpoint