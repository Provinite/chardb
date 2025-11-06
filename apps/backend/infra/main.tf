terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# SQS Queue for Discord Bot Prize Distribution (defined first so URL is available)
module "prize_distribution_queue" {
  source = "../../../infra/modules/sqs-queue"

  queue_name            = "${var.project_name}-prize-distribution-${var.environment}"
  visibility_timeout    = 30
  message_retention     = 345600  # 4 days
  max_receive_count     = 3
  dlq_message_retention = 1209600 # 14 days
  receive_wait_time     = 0       # Short polling for consumer

  tags = local.common_tags
}

# EC2 Docker Host for Backend
module "backend_docker_host" {
  source = "../../../infra/modules/ec2-docker-host"

  name          = "${var.project_name}-backend-${var.environment}"
  instance_type = var.instance_type

  ssh_allowed_cidr_blocks = var.ssh_allowed_cidr_blocks

  ecr_repository_url = var.backend_ecr_repository_url
  aws_region         = var.aws_region
  root_volume_size   = var.root_volume_size

  # API Gateway integration
  enable_api_gateway = var.enable_api_gateway
  backend_port       = var.backend_port

  # DeviantArt OAuth Configuration
  deviantart_client_id     = var.deviantart_client_id
  deviantart_client_secret = var.deviantart_client_secret
  deviantart_callback_url  = var.deviantart_callback_url

  # Discord Configuration
  discord_client_id     = var.discord_client_id
  discord_client_secret = var.discord_client_secret
  discord_callback_url  = var.discord_callback_url
  discord_bot_token     = var.discord_bot_token

  # SQS Queue URL
  sqs_queue_url = module.prize_distribution_queue.queue_url

  tags = local.common_tags
}

# CloudFront distribution for HTTPS termination (optional)
module "cloudfront_api" {
  count  = var.enable_api_gateway ? 1 : 0
  source = "../../../infra/modules/cloudfront-api"

  app_name    = var.project_name
  environment = var.environment
  
  backend_public_dns = module.backend_docker_host.public_dns
  backend_port       = var.backend_port
  
  # Optional custom domain
  custom_domain_name    = var.api_custom_domain_name
  acm_certificate_arn   = var.api_acm_certificate_arn
  route53_zone_id       = var.api_route53_zone_id
}

# Attach SQS consumer policy to backend instance role
resource "aws_iam_role_policy_attachment" "backend_sqs_consumer" {
  role       = module.backend_docker_host.iam_role_name
  policy_arn = module.prize_distribution_queue.consumer_policy_arn
}

locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    App         = "backend"
    ManagedBy   = "terraform"
  }
}