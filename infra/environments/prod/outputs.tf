##############################################################################
# ECR Outputs
##############################################################################

output "backend_ecr_repository_url" {
  description = "URL of the backend ECR repository"
  value       = module.backend_ecr.repository_url
}

output "backend_ecr_repository_name" {
  description = "Name of the backend ECR repository"
  value       = module.backend_ecr.repository_name
}

##############################################################################
# VPC Outputs
##############################################################################

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.vpc.public_subnet_ids
}

output "availability_zones" {
  description = "Availability zones used"
  value       = module.vpc.availability_zones
}

##############################################################################
# RDS Outputs
##############################################################################

output "rds_endpoint" {
  description = "RDS connection endpoint"
  value       = module.rds.db_endpoint
}

output "rds_address" {
  description = "RDS hostname"
  value       = module.rds.db_address
}

output "rds_port" {
  description = "RDS port"
  value       = module.rds.db_port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = module.rds.db_name
}

output "rds_username" {
  description = "RDS master username"
  value       = module.rds.db_username
  sensitive   = true
}

output "rds_password" {
  description = "RDS master password"
  value       = module.rds.db_password
  sensitive   = true
}

output "rds_connection_string" {
  description = "PostgreSQL connection string"
  value       = module.rds.connection_string
  sensitive   = true
}

##############################################################################
# ECS Outputs
##############################################################################

output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = module.ecs.cluster_id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = module.ecs.service_name
}

output "ecs_task_definition_family" {
  description = "Family of the ECS task definition"
  value       = module.ecs.task_definition_family
}

output "ecs_log_group_name" {
  description = "Name of the CloudWatch log group for ECS"
  value       = module.ecs.log_group_name
}

##############################################################################
# NLB Outputs
##############################################################################

output "nlb_arn" {
  description = "ARN of the Network Load Balancer"
  value       = module.nlb.nlb_arn
}

output "nlb_dns_name" {
  description = "DNS name of the Network Load Balancer"
  value       = module.nlb.nlb_dns_name
}

output "nlb_target_group_arn" {
  description = "ARN of the NLB target group"
  value       = module.nlb.target_group_arn
}

##############################################################################
# API CloudFront Outputs
##############################################################################

output "api_distribution_id" {
  description = "ID of the API CloudFront distribution"
  value       = module.api_cloudfront.distribution_id
}

output "api_distribution_domain_name" {
  description = "Domain name of the API CloudFront distribution"
  value       = module.api_cloudfront.distribution_domain_name
}

output "api_url" {
  description = "Full URL of the API"
  value       = module.api_cloudfront.subdomain_url
}

##############################################################################
# Frontend Outputs
##############################################################################

output "frontend_bucket_name" {
  description = "Name of the frontend S3 bucket"
  value       = module.frontend.bucket_name
}

output "frontend_cloudfront_distribution_id" {
  description = "ID of the frontend CloudFront distribution"
  value       = module.frontend.cloudfront_distribution_id
}

output "frontend_cloudfront_domain_name" {
  description = "Domain name of the frontend CloudFront distribution"
  value       = module.frontend.cloudfront_domain_name
}

output "frontend_website_url" {
  description = "URL of the frontend website"
  value       = module.frontend.website_url
}

##############################################################################
# Secrets Outputs
##############################################################################

output "jwt_secret" {
  description = "Generated JWT secret"
  value       = random_password.jwt_secret.result
  sensitive   = true
}

output "cloudfront_secret_header" {
  description = "CloudFront secret header for origin authentication"
  value       = random_password.cloudfront_secret.result
  sensitive   = true
}

##############################################################################
# OAuth Configuration Outputs
##############################################################################

output "deviantart_client_id" {
  description = "DeviantArt OAuth client ID"
  value       = var.deviantart_client_id
  sensitive   = true
}

output "deviantart_callback_url" {
  description = "DeviantArt OAuth callback URL"
  value       = var.deviantart_callback_url
}

output "discord_client_id" {
  description = "Discord OAuth client ID"
  value       = var.discord_client_id
  sensitive   = true
}

output "discord_callback_url" {
  description = "Discord OAuth callback URL"
  value       = var.discord_callback_url
}

##############################################################################
# Deployment Information
##############################################################################

output "deployment_info" {
  description = "Information for deploying the application"
  value = <<-EOT
Production Infrastructure Deployed Successfully!

VPC:
  VPC ID: ${module.vpc.vpc_id}
  CIDR: ${module.vpc.vpc_cidr}
  Availability Zones: ${join(", ", module.vpc.availability_zones)}

Database:
  Endpoint: ${module.rds.db_endpoint}
  Database: ${module.rds.db_name}
  Username: ${module.rds.db_username}

ECS:
  Cluster: ${module.ecs.cluster_name}
  Service: ${module.ecs.service_name}
  Log Group: ${module.ecs.log_group_name}

API:
  URL: ${module.api_cloudfront.subdomain_url}
  CloudFront Distribution: ${module.api_cloudfront.distribution_id}
  NLB DNS: ${module.nlb.nlb_dns_name}

Frontend:
  URL: ${module.frontend.website_url}
  CloudFront Distribution: ${module.frontend.cloudfront_distribution_id}
  S3 Bucket: ${module.frontend.bucket_name}

ECR Repository:
  URL: ${module.backend_ecr.repository_url}

Next Steps:
1. Build and push your backend Docker image to ECR:
   aws ecr get-login-password --region ${data.aws_region.current.name} | docker login --username AWS --password-stdin ${module.backend_ecr.repository_url}
   docker build -t ${module.backend_ecr.repository_url}:latest .
   docker push ${module.backend_ecr.repository_url}:latest

2. Update ECS service to use the new image:
   aws ecs update-service --cluster ${module.ecs.cluster_name} --service ${module.ecs.service_name} --force-new-deployment

3. Build and deploy frontend:
   cd apps/frontend
   npm run build
   aws s3 sync dist/ s3://${module.frontend.bucket_name}/
   aws cloudfront create-invalidation --distribution-id ${module.frontend.cloudfront_distribution_id} --paths "/*"

4. Access your application:
   Frontend: ${module.frontend.website_url}
   API: ${module.api_cloudfront.subdomain_url}
EOT
}
