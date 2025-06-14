terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "clovercoin-tf-state"
    key    = "thclone/environments/prod"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
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
}

# Frontend infrastructure (placeholder for future)
# module "frontend" {
#   source = "../../../apps/frontend/infra"
#   
#   environment             = var.environment
#   custom_domain_name      = var.frontend_custom_domain_name
#   acm_certificate_arn     = var.frontend_acm_certificate_arn
#   route53_zone_id         = var.frontend_route53_zone_id
# }


locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}
