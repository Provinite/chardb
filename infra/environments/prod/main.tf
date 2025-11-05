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

##############################################################################
# AWS Secrets Manager - Store sensitive application secrets
##############################################################################

# Database password secret
resource "aws_secretsmanager_secret" "db_password" {
  name        = "${var.project_name}-${var.environment}-db-password"
  description = "RDS database password for ${var.project_name}"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = module.rds.db_password
}

# JWT secret
resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${var.project_name}-${var.environment}-jwt-secret"
  description = "JWT secret for authentication"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

# DeviantArt client secret
resource "aws_secretsmanager_secret" "deviantart_client_secret" {
  name        = "${var.project_name}-${var.environment}-deviantart-secret"
  description = "DeviantArt OAuth client secret"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "deviantart_client_secret" {
  secret_id     = aws_secretsmanager_secret.deviantart_client_secret.id
  secret_string = var.deviantart_client_secret
}

# Discord client secret
resource "aws_secretsmanager_secret" "discord_client_secret" {
  name        = "${var.project_name}-${var.environment}-discord-secret"
  description = "Discord OAuth client secret"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "discord_client_secret" {
  secret_id     = aws_secretsmanager_secret.discord_client_secret.id
  secret_string = var.discord_client_secret
}

# Discord bot token
resource "aws_secretsmanager_secret" "discord_bot_token" {
  name        = "${var.project_name}-${var.environment}-discord-bot-token"
  description = "Discord bot token for bot integration"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "discord_bot_token" {
  secret_id     = aws_secretsmanager_secret.discord_bot_token.id
  secret_string = var.discord_bot_token
}

# Database URL (complete connection string)
resource "aws_secretsmanager_secret" "database_url" {
  name        = "${var.project_name}-${var.environment}-database-url"
  description = "Complete PostgreSQL connection URL for Prisma"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://${module.rds.db_username}:${urlencode(module.rds.db_password)}@${module.rds.db_address}:${module.rds.db_port}/${module.rds.db_name}"
}

# OpenTelemetry OTLP headers
resource "aws_secretsmanager_secret" "otel_otlp_headers" {
  name        = "${var.project_name}-${var.environment}-otel-otlp-headers"
  description = "OpenTelemetry OTLP exporter headers for authentication"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "otel_otlp_headers" {
  secret_id     = aws_secretsmanager_secret.otel_otlp_headers.id
  secret_string = var.otel_otlp_headers
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

  # Environment Variables (non-sensitive)
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
      name  = "DEVIANTART_CLIENT_ID"
      value = var.deviantart_client_id
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
      name  = "DISCORD_CALLBACK_URL"
      value = var.discord_callback_url
    },
    {
      name  = "API_URL"
      value = var.domain_name != null ? "https://api.${var.domain_name}" : ""
    },
    {
      name  = "FRONTEND_URL"
      value = var.domain_name != null ? "https://${var.domain_name}" : ""
    },
    # GraphQL Security Configuration
    {
      name  = "GRAPHQL_PLAYGROUND"
      value = "false"
    },
    {
      name  = "GRAPHQL_INTROSPECTION"
      value = "false"
    },
    {
      name  = "GRAPHQL_CSRF_PREVENTION"
      value = "true"
    },
    # OpenTelemetry Configuration
    {
      name  = "OTEL_SERVICE_NAME"
      value = "${var.project_name}-backend"
    },
    {
      name  = "OTEL_SERVICE_VERSION"
      value = local.backend_version
    },
    {
      name  = "OTEL_EXPORTER_OTLP_ENDPOINT"
      value = var.otel_exporter_endpoint
    },
    {
      name  = "OTEL_EXPORTER_OTLP_PROTOCOL"
      value = "http/protobuf"
    },
    {
      name  = "OTEL_TRACES_EXPORTER"
      value = "otlp"
    },
    {
      name  = "OTEL_METRICS_EXPORTER"
      value = "otlp"
    },
    {
      name  = "OTEL_LOG_LEVEL"
      value = var.otel_log_level
    },
    {
      name  = "OTEL_RESOURCE_ATTRIBUTES"
      value = "service.name=api,service.namespace=${var.project_name},deployment.environment=${var.environment}"
    },
    {
      name  = "OTEL_NODE_RESOURCE_DETECTORS"
      value = "env,host,os"
    },
  ]

  # Secrets from AWS Secrets Manager
  secret_variables = [
    {
      name      = "DATABASE_URL"
      valueFrom = aws_secretsmanager_secret.database_url.arn
    },
    {
      name      = "JWT_SECRET"
      valueFrom = aws_secretsmanager_secret.jwt_secret.arn
    },
    {
      name      = "DEVIANTART_CLIENT_SECRET"
      valueFrom = aws_secretsmanager_secret.deviantart_client_secret.arn
    },
    {
      name      = "DISCORD_CLIENT_SECRET"
      valueFrom = aws_secretsmanager_secret.discord_client_secret.arn
    },
    {
      name      = "DISCORD_BOT_TOKEN"
      valueFrom = aws_secretsmanager_secret.discord_bot_token.arn
    },
    {
      name      = "OTEL_EXPORTER_OTLP_HEADERS"
      valueFrom = aws_secretsmanager_secret.otel_otlp_headers.arn
    },
  ]

  # Secret ARNs for IAM permissions
  secrets_arns = [
    aws_secretsmanager_secret.database_url.arn,
    aws_secretsmanager_secret.jwt_secret.arn,
    aws_secretsmanager_secret.deviantart_client_secret.arn,
    aws_secretsmanager_secret.discord_client_secret.arn,
    aws_secretsmanager_secret.discord_bot_token.arn,
    aws_secretsmanager_secret.otel_otlp_headers.arn,
  ]

  # Container Health Check
  health_check = {
    command     = ["CMD-SHELL", "curl -f http://localhost:${var.backend_container_port}/health || exit 1"]
    interval    = 30
    timeout     = 3
    retries     = 3
    startPeriod = 5
  }

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

  # Read backend version from package.json
  backend_package_json = jsondecode(file("${path.module}/../../../apps/backend/package.json"))
  backend_version      = local.backend_package_json.version
}
