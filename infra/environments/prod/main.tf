terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
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

# Additional provider for us-east-1 (required for CloudFront ACM certificates)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Route53 hosted zone lookup
data "aws_route53_zone" "main" {
  count = var.domain_name != null ? 1 : 0
  name  = var.domain_name
}

# Get current AWS account ID and region
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Generate random secret for CloudFront custom header
resource "random_password" "cloudfront_secret" {
  length  = 32
  special = false
}

# Generate JWT secret
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# ACM Certificate for frontend (root domain) - must be in us-east-1 for CloudFront
resource "aws_acm_certificate" "frontend" {
  count             = var.domain_name != null ? 1 : 0
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = local.common_tags
}

# DNS validation records for frontend certificate
resource "aws_route53_record" "frontend_cert_validation" {
  for_each = var.domain_name != null ? {
    for dvo in aws_acm_certificate.frontend[0].domain_validation_options : dvo.domain_name => {
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

# Frontend certificate validation
resource "aws_acm_certificate_validation" "frontend" {
  count                   = var.domain_name != null ? 1 : 0
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.frontend[0].arn
  validation_record_fqdns = [for record in aws_route53_record.frontend_cert_validation : record.fqdn]
}

# ACM Certificate for API (regional certificate for NLB)
resource "aws_acm_certificate" "api" {
  count             = var.domain_name != null ? 1 : 0
  domain_name       = "api.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.common_tags
}

# DNS validation records for API certificate
resource "aws_route53_record" "api_cert_validation" {
  for_each = var.domain_name != null ? {
    for dvo in aws_acm_certificate.api[0].domain_validation_options : dvo.domain_name => {
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

# API certificate validation
resource "aws_acm_certificate_validation" "api" {
  count                   = var.domain_name != null ? 1 : 0
  certificate_arn         = aws_acm_certificate.api[0].arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
}

##############################################################################
# VPC Infrastructure
##############################################################################

module "vpc" {
  source = "../../modules/vpc"

  name_prefix = "${var.project_name}-${var.environment}"
  vpc_cidr    = var.vpc_cidr
  az_count    = var.az_count

  tags = local.common_tags
}

##############################################################################
# ECR Repository
##############################################################################

module "backend_ecr" {
  source = "../../modules/ecr"

  name = "${var.project_name}-backend-${var.environment}"

  tags = local.common_tags
}

##############################################################################
# RDS Database
##############################################################################

module "rds" {
  source = "../../modules/rds"

  name_prefix          = "${var.project_name}-${var.environment}"
  vpc_id               = module.vpc.vpc_id
  db_subnet_group_name = module.vpc.db_subnet_group_name

  # Instance Configuration
  instance_class    = var.rds_instance_class
  allocated_storage = var.rds_allocated_storage
  storage_type      = var.rds_storage_type

  # Database Configuration
  engine_version  = var.rds_engine_version
  database_name   = var.rds_database_name
  master_username = var.rds_master_username

  # Networking
  publicly_accessible    = var.rds_publicly_accessible
  multi_az               = var.rds_multi_az
  management_cidr_blocks = var.rds_management_cidr_blocks

  # Backup
  backup_retention_period = var.rds_backup_retention_period
  skip_final_snapshot     = var.rds_skip_final_snapshot

  # Monitoring
  enable_enhanced_monitoring = var.rds_enable_enhanced_monitoring
  monitoring_interval        = var.rds_monitoring_interval

  # Security
  deletion_protection = var.rds_deletion_protection

  tags = local.common_tags
}

##############################################################################
# Internal Network Load Balancer
##############################################################################

module "nlb" {
  source = "../../modules/nlb-internal"

  name_prefix     = "${var.project_name}-${var.environment}"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.public_subnet_ids
  certificate_arn = var.domain_name != null ? aws_acm_certificate_validation.api[0].certificate_arn : ""

  # Target Configuration
  target_port     = var.backend_container_port
  target_protocol = "TCP"

  # Health Check
  health_check_protocol            = "HTTP"
  health_check_path                = var.backend_health_check_path
  health_check_interval            = var.backend_health_check_interval
  health_check_healthy_threshold   = 2
  health_check_unhealthy_threshold = 2

  # NLB Configuration
  enable_deletion_protection       = var.nlb_enable_deletion_protection
  enable_cross_zone_load_balancing = true

  tags = local.common_tags
}

##############################################################################
# ECS Fargate
##############################################################################

module "ecs" {
  source = "../../modules/ecs-fargate"

  name_prefix           = "${var.project_name}-${var.environment}"
  vpc_id                = module.vpc.vpc_id
  subnet_ids            = module.vpc.public_subnet_ids
  nlb_security_group_id = module.nlb.security_group_id
  target_group_arn      = module.nlb.target_group_arn
  aws_region            = data.aws_region.current.name

  # Container Configuration
  container_name  = "backend"
  container_image = var.backend_container_image != "" ? var.backend_container_image : "${module.backend_ecr.repository_url}:latest"
  container_port  = var.backend_container_port

  # Task Configuration
  task_cpu    = var.ecs_task_cpu
  task_memory = var.ecs_task_memory

  # Service Configuration
  desired_count    = var.ecs_desired_count
  assign_public_ip = true

  # Environment Variables
  environment_variables = [
    {
      name  = "NODE_ENV"
      value = "production"
    },
    {
      name  = "PORT"
      value = tostring(var.backend_container_port)
    },
    {
      name  = "DATABASE_HOST"
      value = module.rds.db_address
    },
    {
      name  = "DATABASE_PORT"
      value = tostring(module.rds.db_port)
    },
    {
      name  = "DATABASE_NAME"
      value = module.rds.db_name
    },
    {
      name  = "DATABASE_USER"
      value = module.rds.db_username
    },
    {
      name  = "DATABASE_PASSWORD"
      value = module.rds.db_password
    },
    {
      name  = "JWT_SECRET"
      value = random_password.jwt_secret.result
    },
    {
      name  = "DEVIANTART_CLIENT_ID"
      value = var.deviantart_client_id
    },
    {
      name  = "DEVIANTART_CLIENT_SECRET"
      value = var.deviantart_client_secret
    },
    {
      name  = "DEVIANTART_CALLBACK_URL"
      value = var.deviantart_callback_url
    },
    {
      name  = "DISCORD_CLIENT_ID"
      value = var.discord_client_id
    },
    {
      name  = "DISCORD_CLIENT_SECRET"
      value = var.discord_client_secret
    },
    {
      name  = "DISCORD_CALLBACK_URL"
      value = var.discord_callback_url
    },
    {
      name  = "DISCORD_BOT_TOKEN"
      value = var.discord_bot_token
    },
    {
      name  = "API_URL"
      value = var.domain_name != null ? "https://api.${var.domain_name}" : ""
    },
    {
      name  = "FRONTEND_URL"
      value = var.domain_name != null ? "https://${var.domain_name}" : ""
    },
  ]

  # Logging
  log_retention_days        = var.ecs_log_retention_days
  enable_container_insights = var.ecs_enable_container_insights

  tags = local.common_tags

  depends_on = [
    module.nlb,
  ]
}

##############################################################################
# Cross-Security-Group Rules (to avoid circular dependencies)
##############################################################################

# Allow ECS to connect to RDS
resource "aws_vpc_security_group_egress_rule" "ecs_to_rds" {
  security_group_id = module.ecs.security_group_id

  description                  = "Allow PostgreSQL to RDS"
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = module.rds.security_group_id
}

# Allow RDS to receive connections from ECS
resource "aws_vpc_security_group_ingress_rule" "rds_from_ecs" {
  security_group_id = module.rds.security_group_id

  description                  = "PostgreSQL from ECS"
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = module.ecs.security_group_id
}

##############################################################################
# CloudFront VPC Origin for API
##############################################################################

module "api_cloudfront" {
  source = "../../modules/cloudfront-vpc-origin"

  providers = {
    aws.us_east_1 = aws.us_east_1
  }

  name_prefix  = "${var.project_name}-${var.environment}-api"
  domain_name  = var.domain_name
  subdomain    = "api.${var.domain_name}"
  nlb_dns_name = module.nlb.nlb_dns_name

  # CloudFront Configuration
  price_class              = var.cloudfront_price_class
  cloudfront_secret_header = random_password.cloudfront_secret.result

  # CORS Configuration
  cors_allowed_origins = [
    var.domain_name != null ? "https://${var.domain_name}" : "*",
  ]

  tags = local.common_tags

  depends_on = [
    module.nlb,
    module.ecs,
  ]
}

##############################################################################
# Frontend S3 + CloudFront
##############################################################################

module "frontend" {
  source = "../../../apps/frontend/infra"

  environment         = var.environment
  project_name        = var.project_name
  domain_name         = var.domain_name
  acm_certificate_arn = var.domain_name != null ? aws_acm_certificate_validation.frontend[0].certificate_arn : null
  route53_zone_id     = var.domain_name != null ? data.aws_route53_zone.main[0].zone_id : null
}

##############################################################################
# Local Variables
##############################################################################

locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}
