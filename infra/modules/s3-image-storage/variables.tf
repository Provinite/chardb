variable "bucket_name" {
  description = "Name of the S3 bucket for image storage"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "allowed_cors_origins" {
  description = "List of allowed CORS origins for presigned URL uploads"
  type        = list(string)
  default     = ["*"]
}

variable "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution that will access this bucket (optional for initial creation)"
  type        = string
  default     = null
}
