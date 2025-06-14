# $schema: https://raw.githubusercontent.com/hashicorp/terraform/main/schemas/providers/aws.json

variable "app_name" {
  description = "Name of the application"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, prod, etc.)"
  type        = string
}

variable "backend_host" {
  description = "Backend server hostname or IP address"
  type        = string
}

variable "backend_port" {
  description = "Backend server port"
  type        = number
  default     = 4000
}

variable "network_load_balancer_arn" {
  description = "ARN of the Network Load Balancer for VPC Link"
  type        = string
}

variable "custom_domain_name" {
  description = "Custom domain name for API Gateway (optional)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for custom domain (required if custom_domain_name is set)"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for custom domain (optional)"
  type        = string
  default     = ""
}