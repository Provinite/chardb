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
  default     = 20
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
