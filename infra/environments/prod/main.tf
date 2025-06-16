terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "clovercoin-tf-state"
    key    = "chardb/environments/prod"
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

# ACM Certificate for both API and frontend domains (if domain_name is provided)
resource "aws_acm_certificate" "main" {
  count           = var.domain_name != null ? 1 : 0
  domain_name     = var.domain_name  # Root domain for prod frontend
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}"  # Wildcard for api.example.com
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
  
  # Custom domain configuration (if domain_name is provided)
  api_custom_domain_name   = var.domain_name != null ? "api.${var.domain_name}" : ""
  api_acm_certificate_arn  = var.domain_name != null ? aws_acm_certificate_validation.main[0].certificate_arn : ""
  api_route53_zone_id      = var.domain_name != null ? data.aws_route53_zone.main[0].zone_id : ""
}

# Frontend infrastructure
module "frontend" {
  source = "../../../apps/frontend/infra"
  
  environment         = var.environment
  project_name        = var.project_name
  domain_name         = var.domain_name  # Root domain for prod frontend
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
