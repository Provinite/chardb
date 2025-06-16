# ECR outputs
output "backend_ecr_repository_url" {
  description = "URL of the backend ECR repository"
  value       = module.backend_ecr.repository_url
}

# Backend infrastructure outputs
output "backend_instance_id" {
  description = "Backend EC2 instance ID"
  value       = module.backend.instance_id
}

output "backend_public_ip" {
  description = "Backend public IP address"
  value       = module.backend.public_ip
}

output "backend_public_dns" {
  description = "Backend public DNS name"
  value       = module.backend.public_dns
}

output "backend_url" {
  description = "Backend URL (API Gateway if enabled, otherwise direct EC2)"
  value       = module.backend.backend_url
}

output "backend_ssh_command" {
  description = "SSH command to connect to backend instance"
  value       = module.backend.ssh_command
}

output "backend_ssh_private_key" {
  description = "Private SSH key for backend instance (save to .pem file)"
  value       = module.backend.ssh_private_key
  sensitive   = true
}

output "backend_ssh_key_name" {
  description = "Name of the SSH key pair for backend instance"
  value       = module.backend.ssh_key_name
}

output "ssh_key_setup_instructions" {
  description = "Instructions to save and use the SSH key"
  value = <<-EOT
To save the SSH key and connect:
1. terraform output -raw backend_ssh_private_key > ${module.backend.ssh_key_name}.pem
2. chmod 600 ${module.backend.ssh_key_name}.pem  
3. ${module.backend.ssh_command}
EOT
}

output "jaeger_url" {
  description = "Jaeger UI URL"
  value       = module.backend.jaeger_url
}

# CloudFront API outputs (when enabled)
output "api_gateway_url" {
  description = "CloudFront API URL (if enabled)"
  value       = module.backend.cloudfront_api_url
}

output "backend_db_password" {
  description = "Generated database password for backend"
  value       = module.backend.db_password
  sensitive   = true
}

output "backend_jwt_secret" {
  description = "Generated JWT secret for backend"
  value       = module.backend.jwt_secret
  sensitive   = true
}

# Frontend infrastructure outputs
output "frontend_bucket_name" {
  description = "Name of the frontend S3 bucket"
  value       = module.frontend.bucket_name
}

output "frontend_cloudfront_distribution_id" {
  description = "ID of the frontend CloudFront distribution"
  value       = module.frontend.cloudfront_distribution_id
}

output "frontend_cloudfront_domain_name" {
  description = "Domain name of the frontend CloudFront distribution"
  value       = module.frontend.cloudfront_domain_name
}

output "frontend_website_url" {
  description = "URL of the frontend website"
  value       = module.frontend.website_url
}