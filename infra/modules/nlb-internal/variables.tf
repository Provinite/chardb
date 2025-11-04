variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where NLB will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the NLB"
  type        = list(string)
}

variable "certificate_arn" {
  description = "ARN of ACM certificate for HTTPS"
  type        = string
}

# Target Group Configuration
variable "target_port" {
  description = "Port for the target group"
  type        = number
  default     = 3000
}

variable "target_protocol" {
  description = "Protocol for the target group (TCP, TLS, UDP, TCP_UDP)"
  type        = string
  default     = "TCP"
}

# Health Check Configuration
variable "health_check_enabled" {
  description = "Enable health checks"
  type        = bool
  default     = true
}

variable "health_check_healthy_threshold" {
  description = "Number of consecutive successful health checks"
  type        = number
  default     = 2
}

variable "health_check_unhealthy_threshold" {
  description = "Number of consecutive failed health checks"
  type        = number
  default     = 2
}

variable "health_check_interval" {
  description = "Health check interval in seconds"
  type        = number
  default     = 30
}

variable "health_check_path" {
  description = "Health check path (for HTTP/HTTPS protocols)"
  type        = string
  default     = "/health"
}

variable "health_check_protocol" {
  description = "Protocol for health checks (HTTP, HTTPS, TCP)"
  type        = string
  default     = "HTTP"
}

variable "health_check_matcher" {
  description = "Expected response codes for health checks"
  type        = string
  default     = "200-299"
}

variable "health_check_timeout" {
  description = "Health check timeout in seconds"
  type        = number
  default     = 10
}

variable "deregistration_delay" {
  description = "Deregistration delay in seconds"
  type        = number
  default     = 30
}

# NLB Configuration
variable "enable_deletion_protection" {
  description = "Enable deletion protection for NLB"
  type        = bool
  default     = false
}

variable "enable_cross_zone_load_balancing" {
  description = "Enable cross-zone load balancing"
  type        = bool
  default     = true
}

variable "enable_http_listener" {
  description = "Enable HTTP listener on port 80"
  type        = bool
  default     = false
}

# TLS Configuration
variable "ssl_policy" {
  description = "SSL policy for HTTPS listener"
  type        = string
  default     = "ELBSecurityPolicy-TLS13-1-2-2021-06"
}

variable "alpn_policy" {
  description = "ALPN policy for TLS listener"
  type        = string
  default     = "HTTP2Preferred"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
