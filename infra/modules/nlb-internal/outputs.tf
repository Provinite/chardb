output "nlb_id" {
  description = "ID of the Network Load Balancer"
  value       = aws_lb.nlb.id
}

output "nlb_arn" {
  description = "ARN of the Network Load Balancer"
  value       = aws_lb.nlb.arn
}

output "nlb_dns_name" {
  description = "DNS name of the Network Load Balancer"
  value       = aws_lb.nlb.dns_name
}

output "nlb_zone_id" {
  description = "Zone ID of the Network Load Balancer"
  value       = aws_lb.nlb.zone_id
}

output "target_group_arn" {
  description = "ARN of the target group"
  value       = aws_lb_target_group.ecs.arn
}

output "target_group_name" {
  description = "Name of the target group"
  value       = aws_lb_target_group.ecs.name
}

output "security_group_id" {
  description = "ID of the NLB security group"
  value       = aws_security_group.nlb.id
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener"
  value       = aws_lb_listener.https.arn
}

output "http_listener_arn" {
  description = "ARN of the HTTP listener (if enabled)"
  value       = var.enable_http_listener ? aws_lb_listener.http[0].arn : null
}
