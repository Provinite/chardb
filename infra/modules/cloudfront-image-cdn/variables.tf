variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket containing images"
  type        = string
}

variable "s3_bucket_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  type        = string
}

variable "domain_name" {
  description = "Custom domain name for the CloudFront distribution (e.g., images.dev.chardb.cc)"
  type        = string
  default     = null
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for custom domain (must be in us-east-1)"
  type        = string
  default     = null
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS record creation"
  type        = string
  default     = null
}
