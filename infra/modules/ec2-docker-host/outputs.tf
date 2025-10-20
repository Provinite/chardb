output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.docker_host.id
}

output "public_ip" {
  description = "Public IP address of the instance"
  value       = aws_eip.docker_host.public_ip
}

output "public_dns" {
  description = "Public DNS name of the Elastic IP"
  value       = aws_eip.docker_host.public_dns
}

output "private_ip" {
  description = "Private IP address of the instance"
  value       = aws_instance.docker_host.private_ip
}

output "elastic_ip_id" {
  description = "ID of the Elastic IP"
  value       = aws_eip.docker_host.id
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.docker_host.id
}

output "jaeger_url" {
  description = "Jaeger UI URL (default port)"
  value       = "http://${aws_eip.docker_host.public_ip}:16686"
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ${aws_key_pair.docker_host.key_name}.pem ec2-user@${aws_eip.docker_host.public_ip}"
}

output "ssh_private_key" {
  description = "Private SSH key for instance access"
  value       = tls_private_key.docker_host.private_key_pem
  sensitive   = true
}

output "ssh_key_name" {
  description = "Name of the SSH key pair"
  value       = aws_key_pair.docker_host.key_name
}


output "db_password" {
  description = "Generated database password"
  value       = random_password.db_password.result
  sensitive   = true
}

output "jwt_secret" {
  description = "Generated JWT secret"
  value       = random_password.jwt_secret.result
  sensitive   = true
}

output "deviantart_client_id" {
  description = "DeviantArt OAuth client ID"
  value       = var.deviantart_client_id
  sensitive   = true
}

output "deviantart_client_secret" {
  description = "DeviantArt OAuth client secret"
  value       = var.deviantart_client_secret
  sensitive   = true
}

output "deviantart_callback_url" {
  description = "DeviantArt OAuth callback URL"
  value       = var.deviantart_callback_url
}