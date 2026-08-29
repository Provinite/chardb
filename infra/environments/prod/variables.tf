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

# Domain configuration
variable "domain_name" {
  description = "Root domain name (e.g., 'example.com'). Route53 hosted zone will be looked up by this name."
  type        = string
  default     = "chardb.cc"
}

##############################################################################
# VPC Configuration
##############################################################################

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones"
  type        = number
  default     = 2
}

##############################################################################
# RDS Configuration
##############################################################################

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

variable "rds_storage_type" {
  description = "Storage type for RDS"
  type        = string
  default     = "gp3"
}

variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  # Track what AWS has actually installed. auto_minor_version_upgrade is on, so
  # AWS moves this forward on its own; leaving a lower value here asks Terraform
  # to downgrade, which RDS cannot do. Bump this after each minor upgrade.
  default = "17.9"
}

variable "rds_database_name" {
  description = "Name of the initial database"
  type        = string
  default     = "chardb"
}

variable "rds_master_username" {
  description = "Master username for RDS"
  type        = string
  default     = "dbadmin"
}

variable "rds_publicly_accessible" {
  description = "Whether RDS is publicly accessible"
  type        = bool
  default     = true
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = false
}

variable "rds_management_cidr_blocks" {
  description = "CIDR blocks allowed to reach RDS on 5432 for administration"
  type        = list(string)
  # Empty by default so nothing is exposed implicitly. Set it in prod.tfvars,
  # which is gitignored -- an address does not belong in a public repository.
  # Note the live environment has a rule for an address that is not in any
  # tfvars, so an apply will DESTROY it and remove direct psql access. Put the
  # address here first if you want to keep it.
  default = []
}

variable "rds_backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "rds_skip_final_snapshot" {
  description = "Skip final snapshot on RDS deletion"
  type        = bool
  default     = false
}

variable "rds_enable_enhanced_monitoring" {
  description = "Enable enhanced monitoring for RDS"
  type        = bool
  default     = true
}

variable "rds_monitoring_interval" {
  description = "Enhanced monitoring interval in seconds"
  type        = number
  default     = 60
}

variable "rds_deletion_protection" {
  description = "Enable deletion protection for RDS"
  type        = bool
  default     = true
}

##############################################################################
# ECS Configuration
##############################################################################

variable "ecs_task_cpu" {
  description = "CPU units for ECS task (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "ecs_task_memory" {
  description = "Memory for ECS task in MB"
  type        = number
  default     = 512
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1
}

variable "ecs_log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "ecs_enable_container_insights" {
  description = "Enable Container Insights for ECS"
  type        = bool
  default     = true
}

##############################################################################
# Backend Container Configuration
##############################################################################

variable "backend_container_image" {
  description = "Docker image for backend container (defaults to ECR latest)"
  type        = string
  default     = ""
}

variable "backend_container_port" {
  description = "Port the backend container listens on"
  type        = number
  # 4000, not 3000: this is what the application actually binds (see
  # docker/services/backend.yml and the Dockerfile healthcheck) and what the
  # live task definition, container port and NLB target group already use.
  # Leaving it at 3000 makes any apply replace the target group.
  default = 4000
}

variable "backend_health_check_path" {
  description = "Health check path for backend"
  type        = string
  default     = "/health"
}

variable "backend_health_check_interval" {
  description = "Health check interval in seconds"
  type        = number
  default     = 30
}

##############################################################################
# NLB Configuration
##############################################################################

variable "nlb_enable_deletion_protection" {
  description = "Enable deletion protection for NLB"
  type        = bool
  default     = false
}

##############################################################################
# CloudFront Configuration
##############################################################################

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}

##############################################################################
# OAuth Configuration
##############################################################################

variable "deviantart_client_id" {
  description = "DeviantArt OAuth client ID"
  type        = string
  sensitive   = true
}

variable "deviantart_callback_url" {
  description = "DeviantArt OAuth callback URL"
  type        = string
}

variable "discord_client_id" {
  description = "Discord OAuth client ID"
  type        = string
  sensitive   = true
}

variable "discord_callback_url" {
  description = "Discord OAuth callback URL"
  type        = string
}

variable "toyhouse_client_id" {
  description = "ToyHouse OAuth client ID"
  type        = string
  sensitive   = true
}

variable "toyhouse_callback_url" {
  description = "ToyHouse OAuth callback URL"
  type        = string
}

##############################################################################
# OpenTelemetry Configuration
##############################################################################

variable "otel_exporter_endpoint" {
  description = "OpenTelemetry OTLP exporter base endpoint (e.g., https://otlp-gateway-prod-us-east-2.grafana.net/otlp)"
  type        = string
  default     = ""
}

variable "otel_log_level" {
  description = "OpenTelemetry log level"
  type        = string
  default     = "info"
}

##############################################################################
# Email Configuration
##############################################################################

variable "email_from" {
  description = "Email address used as the sender for outbound emails"
  type        = string
  default     = "noreply@chardb.cc"
}

##############################################################################
# GitHub Actions CD
##############################################################################

variable "github_repository" {
  description = "GitHub repository allowed to assume the deploy role, as owner/name"
  type        = string
  default     = "Provinite/chardb"
}

variable "promotion_source_environment" {
  description = <<-EOT
    Environment whose ECR repository a release is promoted from. A release
    deploys the image that environment already ran rather than rebuilding it.
  EOT
  type        = string
  default     = "dev"
}

variable "github_deploy_environment" {
  description = "GitHub environment the release deploy runs in"
  type        = string
  default     = "production"
}
