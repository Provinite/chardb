terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

# No shared infrastructure needed for S3 static site

# S3 Static Site for Frontend
module "frontend_static_site" {
  source = "../../../infra/modules/s3-static-site"

  name        = "${var.project_name}-frontend-${var.environment}"
  bucket_name = "${var.project_name}-frontend-${var.environment}-${random_id.bucket_suffix.hex}"
  
  domain_name           = var.domain_name
  acm_certificate_arn   = var.acm_certificate_arn
  route53_zone_id       = var.route53_zone_id
  
  default_root_object = "index.html"
  default_ttl        = var.default_ttl
  max_ttl            = var.max_ttl
  price_class        = var.price_class
  
  tags = local.common_tags
}

# Random ID for bucket name uniqueness
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    App         = "frontend"
    ManagedBy   = "terraform"
  }
}