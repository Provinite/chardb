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

# API Gateway outputs (when enabled)
output "api_gateway_url" {
  description = "API Gateway URL (if enabled)"
  value       = module.backend.api_gateway_url
}