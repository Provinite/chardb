variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "chardb"
}

# Backend configuration variables (sensitive/environment-specific only)
variable "backend_instance_type" {
  description = "EC2 instance type for backend"
  type        = string
  default     = "t4g.micro"  # Cost-effective default
}

variable "backend_root_volume_size" {
  description = "Size of the root volume in GB for backend"
  type        = number
  default     = 50  # Increased for application needs
}

variable "backend_ssh_allowed_cidr_blocks" {
  description = "CIDR blocks allowed for SSH access to backend"
  type        = list(string)
  # No default - this should be explicitly set per environment for security
}

variable "backend_enable_api_gateway" {
  description = "Whether to enable API Gateway for backend"
  type        = bool
  default     = true  # Production should use HTTPS by default
}

# Domain configuration
variable "domain_name" {
  description = "Root domain name (e.g., 'example.com'). Route53 hosted zone will be looked up by this name."
  type        = string
  default     = "chardb.cc"
}

# Frontend configuration variables (derived from domain_name)
variable "frontend_domain_name" {
  description = "Custom domain name for frontend (will be auto-set to root domain for prod)"
  type        = string
  default     = null
}

variable "frontend_acm_certificate_arn" {
  description = "ACM certificate ARN for frontend custom domain"
  type        = string
  default     = null
}

variable "frontend_route53_zone_id" {
  description = "Route53 hosted zone ID for frontend custom domain"
  type        = string
  default     = null
}

# DeviantArt OAuth Configuration
variable "deviantart_client_id" {
  description = "DeviantArt OAuth client ID"
  type        = string
  sensitive   = true
}

variable "deviantart_client_secret" {
  description = "DeviantArt OAuth client secret"
  type        = string
  sensitive   = true
}

variable "deviantart_callback_url" {
  description = "DeviantArt OAuth callback URL"
  type        = string
}

# Discord OAuth Configuration
variable "discord_client_id" {
  description = "Discord OAuth client ID"
  type        = string
  sensitive   = true
}

variable "discord_client_secret" {
  description = "Discord OAuth client secret"
  type        = string
  sensitive   = true
}

variable "discord_callback_url" {
  description = "Discord OAuth callback URL"
  type        = string
}

# SSH key is now auto-generated during deployment

# Note: Using default VPC, no need to specify VPC/subnet variables

