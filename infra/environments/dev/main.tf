terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "clovercoin-tf-state"
    key    = "chardb/environments/dev"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# Route53 hosted zone lookup (if domain_name is provided)
data "aws_route53_zone" "main" {
  count = var.domain_name != null ? 1 : 0
  name  = var.domain_name
}

# Get current AWS account ID for ACM certificate lookup
data "aws_caller_identity" "current" {}

# ACM Certificate for both API and frontend subdomains (if domain_name is provided)
resource "aws_acm_certificate" "main" {
  count           = var.domain_name != null ? 1 : 0
  domain_name     = "*.${var.environment}.${var.domain_name}"
  validation_method = "DNS"

  subject_alternative_names = [
    "${var.environment}.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = local.common_tags
}

# ACM Certificate validation
resource "aws_acm_certificate_validation" "main" {
  count           = var.domain_name != null ? 1 : 0
  certificate_arn = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Route53 records for ACM certificate validation
resource "aws_route53_record" "cert_validation" {
  for_each = var.domain_name != null ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main[0].zone_id
}

# Note: Using default VPC, no need to specify VPC/subnet IDs

# ECR repository for backend
module "backend_ecr" {
  source = "../../modules/ecr"

  name = "${var.project_name}-backend-${var.environment}"
  # Uses module defaults: MUTABLE tags, scan_on_push=true, max_image_count=10

  tags = local.common_tags
}

# Image storage infrastructure
module "image_storage" {
  source = "../../modules/s3-image-storage"

  bucket_name          = "${var.project_name}-images-${var.environment}"
  environment          = var.environment
  allowed_cors_origins = var.domain_name != null ? ["https://${var.environment}.${var.domain_name}"] : ["*"]
  # No circular dependency - bucket policy is separate
  cloudfront_distribution_arn = null
}

module "image_cdn" {
  source = "../../modules/cloudfront-image-cdn"

  environment                    = var.environment
  s3_bucket_name                 = module.image_storage.bucket_name
  s3_bucket_regional_domain_name = module.image_storage.bucket_regional_domain_name
  domain_name                    = var.domain_name != null ? "images.${var.environment}.${var.domain_name}" : null
  acm_certificate_arn            = var.domain_name != null ? aws_acm_certificate_validation.main[0].certificate_arn : null
  route53_zone_id                = var.domain_name != null ? data.aws_route53_zone.main[0].zone_id : null
}

# Bucket policy to allow CloudFront OAC access (applied after both bucket and CloudFront are created)
resource "aws_s3_bucket_policy" "images" {
  bucket = module.image_storage.bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${module.image_storage.bucket_arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = module.image_cdn.distribution_arn
          }
        }
      }
    ]
  })
}

# Backend infrastructure
module "backend" {
  source = "../../../apps/backend/infra"

  environment = var.environment

  # Pass configuration from environment variables
  project_name               = var.project_name
  aws_region                 = var.aws_region
  instance_type              = var.backend_instance_type
  root_volume_size           = var.backend_root_volume_size
  ssh_allowed_cidr_blocks    = var.backend_ssh_allowed_cidr_blocks
  enable_api_gateway         = var.backend_enable_api_gateway
  backend_ecr_repository_url = module.backend_ecr.repository_url

  # S3 image storage configuration
  s3_images_bucket_arn       = module.image_storage.bucket_arn

  # Custom domain configuration (if domain_name is provided)
  api_custom_domain_name   = var.domain_name != null ? "api.${var.environment}.${var.domain_name}" : ""
  api_acm_certificate_arn  = var.domain_name != null ? aws_acm_certificate_validation.main[0].certificate_arn : ""
  api_route53_zone_id      = var.domain_name != null ? data.aws_route53_zone.main[0].zone_id : ""

  # DeviantArt OAuth Configuration
  deviantart_client_id     = var.deviantart_client_id
  deviantart_client_secret = var.deviantart_client_secret
  deviantart_callback_url  = var.deviantart_callback_url

  # Discord OAuth Configuration
  discord_client_id        = var.discord_client_id
  discord_client_secret    = var.discord_client_secret
  discord_callback_url     = var.discord_callback_url
  discord_bot_token        = var.discord_bot_token
}

# Frontend infrastructure
module "frontend" {
  source = "../../../apps/frontend/infra"
  
  environment         = var.environment
  project_name        = var.project_name
  domain_name         = var.domain_name != null ? "${var.environment}.${var.domain_name}" : null
  acm_certificate_arn = var.domain_name != null ? aws_acm_certificate_validation.main[0].certificate_arn : null
  route53_zone_id     = var.domain_name != null ? data.aws_route53_zone.main[0].zone_id : null
}


locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}
