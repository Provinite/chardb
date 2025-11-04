variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "domain_name" {
  description = "Root domain name (for Route53 zone lookup)"
  type        = string
}

variable "subdomain" {
  description = "Full subdomain for the API (e.g., api.example.com)"
  type        = string
}

variable "nlb_dns_name" {
  description = "DNS name of the Network Load Balancer"
  type        = string
}

# CloudFront Configuration
variable "price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "price_class must be one of: PriceClass_100, PriceClass_200, PriceClass_All"
  }
}

variable "cloudfront_secret_header" {
  description = "Secret header value for CloudFront to origin authentication"
  type        = string
  sensitive   = true
}

# Origin Configuration
variable "origin_keepalive_timeout" {
  description = "Origin keepalive timeout in seconds"
  type        = number
  default     = 5
}

variable "origin_read_timeout" {
  description = "Origin read timeout in seconds"
  type        = number
  default     = 30
}

# Geo Restriction
variable "geo_restriction_type" {
  description = "Type of geo restriction (none, whitelist, blacklist)"
  type        = string
  default     = "none"

  validation {
    condition     = contains(["none", "whitelist", "blacklist"], var.geo_restriction_type)
    error_message = "geo_restriction_type must be one of: none, whitelist, blacklist"
  }
}

variable "geo_restriction_locations" {
  description = "List of country codes for geo restriction"
  type        = list(string)
  default     = []
}

# CORS Configuration
variable "cors_allowed_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
