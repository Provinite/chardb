variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where ECS will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for ECS tasks"
  type        = list(string)
}

variable "nlb_security_group_id" {
  description = "Security group ID of the NLB"
  type        = string
}

variable "target_group_arn" {
  description = "ARN of the NLB target group"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

# Container Configuration
variable "container_name" {
  description = "Name of the container"
  type        = string
  default     = "app"
}

variable "container_image" {
  description = "Docker image for the container"
  type        = string
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 3000
}

# Task Configuration
variable "task_cpu" {
  description = "CPU units for the task (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "Memory for the task in MB"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 1
}

variable "assign_public_ip" {
  description = "Assign public IP to tasks"
  type        = bool
  default     = true
}

# Environment Variables
variable "environment_variables" {
  description = "Environment variables for the container"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "secret_variables" {
  description = "Secret variables from Secrets Manager or Parameter Store"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

variable "secrets_arns" {
  description = "ARNs of secrets in Secrets Manager that the task needs access to"
  type        = list(string)
  default     = []
}

# IAM
variable "task_role_policy_json" {
  description = "Custom IAM policy JSON for the task role"
  type        = string
  default     = null
}

# Logging
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "enable_container_insights" {
  description = "Enable Container Insights for the cluster"
  type        = bool
  default     = true
}

# Health Check
variable "health_check" {
  description = "Container health check configuration"
  type = object({
    command     = list(string)
    interval    = number
    timeout     = number
    retries     = number
    startPeriod = number
  })
  default = null
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
