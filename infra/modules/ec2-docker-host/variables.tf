variable "name" {
  description = "Name prefix for resources"
  type        = string
}

# Note: VPC and subnet are automatically determined using the default VPC

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t4g.micro"  # Cost-effective ARM-based default
}

# SSH key is now auto-generated, no input needed

variable "ssh_allowed_cidr_blocks" {
  description = "CIDR blocks allowed for SSH access"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "ecr_repository_url" {
  description = "ECR repository URL for backend image"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "root_volume_size" {
  description = "Size of the root volume in GB"
  type        = number
  default     = 50
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

variable "enable_api_gateway" {
  description = "Whether to create Network Load Balancer for API Gateway integration"
  type        = bool
  default     = false
}

variable "backend_port" {
  description = "Port that the backend service runs on"
  type        = number
  default     = 4000
}

variable "db_host" {
  description = "Database host"
  type        = string
  default     = "localhost"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "app"
}

variable "db_user" {
  description = "Database user"
  type        = string
  default     = "app"
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

variable "discord_bot_token" {
  description = "Discord bot token for bot integration"
  type        = string
  sensitive   = true
}

# S3 Image Storage Configuration
variable "s3_images_bucket_arn" {
  description = "ARN of the S3 bucket for image storage"
  type        = string
}

variable "sqs_queue_url" {
  description = "SQS queue URL for prize distribution (optional)"
  type        = string
  default     = ""
}
