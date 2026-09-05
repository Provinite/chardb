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
# Application secrets
#
# Cutover from Secrets Manager is order-dependent: copy the live values into
# Parameter Store before applying, or the task definition will inject the
# placeholder. See DEPLOYMENT_GUIDE.md.
##############################################################################

module "app_secrets" {
  source = "../../modules/app-secrets"

  project_name = var.project_name
  environment  = var.environment

  unmanaged_secrets = {
    "deviantart-client-secret" = "DeviantArt OAuth client secret"
    "toyhouse-client-secret"   = "ToyHouse OAuth client secret"
    "discord-client-secret"    = "Discord OAuth client secret"
    "discord-bot-token"        = "Discord bot token"
    "otel-otlp-headers"        = "OpenTelemetry OTLP exporter auth headers"
  }

  tags = local.common_tags
}

# Not in the module above: Terraform generates these two values, so it does
# manage them.
resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.project_name}/${var.environment}/jwt-secret"
  description = "JWT signing secret"
  type        = "SecureString"
  value       = random_password.jwt_secret.result

  tags = merge(local.common_tags, { ValueManagedBy = "terraform" })
}

resource "aws_ssm_parameter" "database_url" {
  name        = "/${var.project_name}/${var.environment}/database-url"
  description = "PostgreSQL connection URL for Prisma"
  type        = "SecureString"
  value       = "postgresql://${module.rds.db_username}:${urlencode(module.rds.db_password)}@${module.rds.db_address}:${module.rds.db_port}/${module.rds.db_name}"

  tags = merge(local.common_tags, { ValueManagedBy = "terraform" })
}

##############################################################################
# AWS SES - Email Identity & DKIM Configuration
##############################################################################

# SES Email Identity for domain verification
resource "aws_sesv2_email_identity" "domain" {
  email_identity = var.domain_name

  dkim_signing_attributes {
    next_signing_key_length = "RSA_2048_BIT"
  }

  tags = local.common_tags
}

# Route53 DNS records for SES domain verification
resource "aws_route53_record" "ses_verification" {
  count   = var.domain_name != null ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[0]]
}

# Route53 DNS records for DKIM signing (3 CNAME records)
resource "aws_route53_record" "ses_dkim" {
  count   = var.domain_name != null ? 3 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "${aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}

# Custom MAIL FROM domain configuration
resource "aws_sesv2_email_identity_mail_from_attributes" "domain" {
  email_identity         = aws_sesv2_email_identity.domain.email_identity
  mail_from_domain       = "mail.${var.domain_name}"
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"
}

# MX record for custom MAIL FROM domain
resource "aws_route53_record" "ses_mail_from_mx" {
  count   = var.domain_name != null ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "mail.${var.domain_name}"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${data.aws_region.current.name}.amazonses.com"]
}

# SPF record for custom MAIL FROM domain
resource "aws_route53_record" "ses_mail_from_spf" {
  count   = var.domain_name != null ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "mail.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

# DMARC record for main domain (monitoring mode, no reports)
resource "aws_route53_record" "dmarc" {
  count   = var.domain_name != null ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["v=DMARC1; p=none;"]
}

# IAM policy for ECS task to send emails via SES
data "aws_iam_policy_document" "ecs_task_ses" {
  statement {
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail",
    ]
    resources = [
      aws_sesv2_email_identity.domain.arn,
    ]
  }
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
# Image Storage Infrastructure
##############################################################################

# Image storage S3 bucket
module "image_storage" {
  source = "../../modules/s3-image-storage"

  bucket_name          = "${var.project_name}-images-${var.environment}"
  environment          = var.environment
  allowed_cors_origins = var.domain_name != null ? ["https://${var.domain_name}"] : ["*"]
  # Bucket policy is separate to avoid circular dependency
  cloudfront_distribution_arn = null
}

# Image CDN CloudFront distribution
module "image_cdn" {
  source = "../../modules/cloudfront-image-cdn"

  environment                    = var.environment
  s3_bucket_name                 = module.image_storage.bucket_name
  s3_bucket_regional_domain_name = module.image_storage.bucket_regional_domain_name
  domain_name                    = var.domain_name != null ? "images.${var.domain_name}" : null
  acm_certificate_arn            = var.domain_name != null ? aws_acm_certificate_validation.frontend[0].certificate_arn : null
  route53_zone_id                = var.domain_name != null ? data.aws_route53_zone.main[0].zone_id : null
}

# Bucket policy to allow CloudFront OAC access
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

##############################################################################
# SQS Queue for Discord Bot Prize Distribution
##############################################################################

module "prize_distribution_queue" {
  source = "../../modules/sqs-queue"

  queue_name            = "${var.project_name}-prize-distribution-${var.environment}"
  visibility_timeout    = 30
  message_retention     = 345600 # 4 days
  max_receive_count     = 3
  dlq_message_retention = 1209600 # 14 days
  receive_wait_time     = 5       # Long polling - reduces API calls and costs

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
  container_name = "backend"
  # A placeholder, deliberately. image is a required field, so the computed
  # definition needs one to be registrable -- but the deploy overwrites it with
  # the released tag, so whatever stands here is never pulled.
  #
  # It used to be the version from package.json. That tracked releases, which
  # sounds right and was not: the release bumps package.json, so the output
  # changed on every release and every plan afterwards showed a diff, for a
  # value nothing deploys. A constant keeps plans empty between real changes.
  #
  # The tag intentionally does not exist in ECR. Registering straight from this
  # output, bypassing the deploy, then fails on the image pull rather than
  # quietly running whatever tag happened to be named here.
  container_image = var.backend_container_image != "" ? var.backend_container_image : "${module.backend_ecr.repository_url}:image-set-by-deploy"
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
      name  = "TOYHOUSE_CLIENT_ID"
      value = var.toyhouse_client_id
    },
    {
      name  = "TOYHOUSE_CALLBACK_URL"
      value = var.toyhouse_callback_url
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
    # The apex domain on its own, without a scheme. The session cookie is set
    # on it so it travels to every community subdomain, and CORS accepts any
    # host under it -- communities are created in the app, so the origins that
    # will call the API cannot be listed here.
    {
      name  = "ROOT_DOMAIN"
      value = var.domain_name != null ? var.domain_name : ""
    },
    {
      name  = "EMAIL_FROM"
      value = var.email_from
    },
    {
      name  = "AWS_REGION"
      value = data.aws_region.current.name
    },
    # S3 Image Storage Configuration
    {
      name  = "S3_IMAGES_BUCKET"
      value = module.image_storage.bucket_name
    },
    {
      name  = "CLOUDFRONT_IMAGES_DOMAIN"
      value = module.image_cdn.custom_domain_name != null ? module.image_cdn.custom_domain_name : module.image_cdn.distribution_domain_name
    },
    # SQS Queue Configuration
    {
      name  = "AWS_SQS_ENABLED"
      value = "true"
    },
    {
      name  = "AWS_SQS_QUEUE_URL"
      value = module.prize_distribution_queue.queue_url
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
    #
    # OTEL_SERVICE_VERSION is deliberately absent: it has to agree with the
    # deployed image, and Terraform only knows the version at apply time. See
    # scripts/deploy-prod-release.sh, which appends it.
    {
      name  = "OTEL_SERVICE_NAME"
      value = "${var.project_name}-backend"
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
      name  = "OTEL_LOGS_EXPORTER"
      value = "otlp"
    },
    {
      name  = "OTEL_LOG_LEVEL"
      value = var.otel_log_level
    },
    {
      name  = "OTEL_RESOURCE_ATTRIBUTES"
      value = "service.name=${var.project_name}-backend,service.namespace=${var.project_name},deployment.environment=${var.environment}"
    },
    {
      name  = "OTEL_NODE_RESOURCE_DETECTORS"
      value = "env,host,os"
    },
  ]

  secret_variables = [
    {
      name      = "DATABASE_URL"
      valueFrom = aws_ssm_parameter.database_url.arn
    },
    {
      name      = "JWT_SECRET"
      valueFrom = aws_ssm_parameter.jwt_secret.arn
    },
    {
      name      = "DEVIANTART_CLIENT_SECRET"
      valueFrom = module.app_secrets.arns["deviantart-client-secret"]
    },
    {
      name      = "TOYHOUSE_CLIENT_SECRET"
      valueFrom = module.app_secrets.arns["toyhouse-client-secret"]
    },
    {
      name      = "DISCORD_CLIENT_SECRET"
      valueFrom = module.app_secrets.arns["discord-client-secret"]
    },
    {
      name      = "DISCORD_BOT_TOKEN"
      valueFrom = module.app_secrets.arns["discord-bot-token"]
    },
    {
      name      = "OTEL_EXPORTER_OTLP_HEADERS"
      valueFrom = module.app_secrets.arns["otel-otlp-headers"]
    },
  ]

  secret_arns = concat(
    [
      aws_ssm_parameter.database_url.arn,
      aws_ssm_parameter.jwt_secret.arn,
    ],
    module.app_secrets.arn_list,
  )

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

  # IAM: Custom task role policy for S3 access
  task_role_policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          module.image_storage.bucket_arn,
          "${module.image_storage.bucket_arn}/*"
        ]
      }
    ]
  })

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
# ECS Task IAM Permissions
##############################################################################

# SES permissions for ECS task role
resource "aws_iam_role_policy" "ecs_task_ses" {
  name   = "${var.project_name}-${var.environment}-ecs-task-ses"
  role   = module.ecs.task_role_name
  policy = data.aws_iam_policy_document.ecs_task_ses.json

  depends_on = [
    module.ecs,
  ]
}

# SQS consumer permissions for ECS task role
resource "aws_iam_role_policy_attachment" "ecs_task_sqs_consumer" {
  role       = module.ecs.task_role_name
  policy_arn = module.prize_distribution_queue.consumer_policy_arn

  depends_on = [
    module.ecs,
  ]
}

##############################################################################
# CloudFront VPC Origin for API
##############################################################################

module "api_cloudfront" {
  source = "../../modules/cloudfront-vpc-origin"

  providers = {
    aws.us_east_1 = aws.us_east_1
  }

  name_prefix     = "${var.project_name}-${var.environment}-api"
  domain_name     = var.domain_name
  subdomain       = "api.${var.domain_name}"
  route53_zone_id = data.aws_route53_zone.main[0].zone_id
  nlb_dns_name    = module.nlb.nlb_dns_name

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

  # Communities live at <slug>.chardb.cc and are all served by this
  # distribution, from the one bundle -- the app reads the hostname to work out
  # which community it is. The certificate above already covers the wildcard.
  serve_wildcard_subdomains = true
}

##############################################################################
# Local Variables
##############################################################################

# CD identity for the release workflow.
#
# No SSM grants: prod has no docker host. Instead it can read the task
# definition Terraform last created, register a revision with a new image, and
# roll the service onto it -- but it cannot apply Terraform, so it can never
# change the shape of that definition.
#
# The trust policy pins the OIDC subject to the "production" GitHub
# environment, so protection rules on that environment gate the deploy before
# a token is ever minted.
module "github_actions_deploy" {
  source = "../../modules/github-actions-deploy"

  name              = "${var.project_name}-${var.environment}"
  github_repository = var.github_repository
  # Prod already has an OIDC provider from the dev environment; there is one
  # per account.
  create_oidc_provider = false
  allowed_environments = [var.github_deploy_environment]

  ecr_repository_arn     = module.backend_ecr.repository_arn
  terraform_state_bucket = "clovercoin-tf-state"
  terraform_state_key    = "chardb/environments/${var.environment}"

  frontend_bucket_arn                  = module.frontend.bucket_arn
  frontend_cloudfront_distribution_arn = module.frontend.cloudfront_distribution_arn

  # Pull-only on the source environment's repository. Its ARN is constructed
  # rather than read: it lives in that environment's state, which this role
  # deliberately cannot see.
  ecr_pull_repository_arns = [
    "arn:aws:ecr:${var.aws_region}:${data.aws_caller_identity.current.account_id}:repository/${var.project_name}-backend-${var.promotion_source_environment}",
  ]

  ecs_service_arn = module.ecs.service_id
  # Revisions of this family only. Register is a write, and paired with
  # PassRole an unscoped one would let the role run a task of its own design.
  ecs_task_definition_family_arn_pattern = "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:task-definition/${module.ecs.task_definition_family}:*"
  ecs_pass_role_arns = [
    module.ecs.task_role_arn,
    module.ecs.task_execution_role_arn,
  ]

  tags = local.common_tags
}

locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}
