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

# API Gateway outputs (when enabled)
output "api_gateway_url" {
  description = "API Gateway URL (if enabled)"
  value       = var.enable_api_gateway ? module.api_gateway[0].api_gateway_url : ""
}

output "api_gateway_custom_domain_url" {
  description = "API Gateway custom domain URL (if configured)"
  value       = var.enable_api_gateway ? module.api_gateway[0].custom_domain_url : ""
}

output "backend_url" {
  description = "Backend URL (API Gateway if enabled, otherwise direct EC2)"
  value = var.enable_api_gateway ? (
    var.api_custom_domain_name != "" ? 
    "https://${var.api_custom_domain_name}" : 
    module.api_gateway[0].api_gateway_url
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