terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
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
  
  tags = local.common_tags
}

# API Gateway for HTTPS termination (optional)
module "api_gateway" {
  count  = var.enable_api_gateway ? 1 : 0
  source = "../../../infra/modules/api-gateway"

  app_name    = var.project_name
  environment = var.environment
  
  backend_host = module.backend_docker_host.private_ip
  backend_port = var.backend_port
  
  network_load_balancer_arn = module.backend_docker_host.network_load_balancer_arn
  
  # Optional custom domain
  custom_domain_name    = var.api_custom_domain_name
  acm_certificate_arn   = var.api_acm_certificate_arn
  route53_zone_id       = var.api_route53_zone_id
}

locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    App         = "backend"
    ManagedBy   = "terraform"
  }
}