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

output "network_load_balancer_arn" {
  description = "ARN of the Network Load Balancer (if enabled)"
  value       = var.enable_api_gateway ? aws_lb.docker_host[0].arn : ""
}

output "network_load_balancer_dns_name" {
  description = "DNS name of the Network Load Balancer (if enabled)"
  value       = var.enable_api_gateway ? aws_lb.docker_host[0].dns_name : ""
}