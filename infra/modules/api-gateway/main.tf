# $schema: https://raw.githubusercontent.com/hashicorp/terraform/main/schemas/providers/aws.json

# API Gateway for EC2 backend with SSL termination
# Provides HTTPS endpoint that proxies to EC2 instance

# API Gateway REST API
resource "aws_api_gateway_rest_api" "backend" {
  name        = "${var.app_name}-${var.environment}-api"
  description = "API Gateway for ${var.app_name} backend in ${var.environment}"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-api"
    Environment = var.environment
    Application = var.app_name
  }
}

# VPC Link for private integration with EC2
resource "aws_api_gateway_vpc_link" "backend" {
  name        = "${var.app_name}-${var.environment}-vpc-link"
  description = "VPC Link for ${var.app_name} backend"
  target_arns = [var.network_load_balancer_arn]

  tags = {
    Name        = "${var.app_name}-${var.environment}-vpc-link"
    Environment = var.environment
    Application = var.app_name
  }
}

# Proxy resource to catch all paths
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.backend.id
  parent_id   = aws_api_gateway_rest_api.backend.root_resource_id
  path_part   = "{proxy+}"
}

# ANY method on proxy resource
resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.backend.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

# Integration with EC2 via VPC Link
resource "aws_api_gateway_integration" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.backend.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method

  integration_http_method = "ANY"
  type                    = "HTTP_PROXY"
  connection_type         = "VPC_LINK"
  connection_id           = aws_api_gateway_vpc_link.backend.id
  uri                     = "http://${var.backend_host}:${var.backend_port}/{proxy}"
}

# Root resource method (for health checks, etc.)
resource "aws_api_gateway_method" "root" {
  rest_api_id   = aws_api_gateway_rest_api.backend.id
  resource_id   = aws_api_gateway_rest_api.backend.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

# Root resource integration
resource "aws_api_gateway_integration" "root" {
  rest_api_id = aws_api_gateway_rest_api.backend.id
  resource_id = aws_api_gateway_rest_api.backend.root_resource_id
  http_method = aws_api_gateway_method.root.http_method

  integration_http_method = "ANY"
  type                    = "HTTP_PROXY"
  connection_type         = "VPC_LINK"
  connection_id           = aws_api_gateway_vpc_link.backend.id
  uri                     = "http://${var.backend_host}:${var.backend_port}/"
}

# Deployment
resource "aws_api_gateway_deployment" "backend" {
  depends_on = [
    aws_api_gateway_integration.proxy,
    aws_api_gateway_integration.root,
  ]

  rest_api_id = aws_api_gateway_rest_api.backend.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy.id,
      aws_api_gateway_integration.proxy.id,
      aws_api_gateway_method.root.id,
      aws_api_gateway_integration.root.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Stage
resource "aws_api_gateway_stage" "backend" {
  deployment_id = aws_api_gateway_deployment.backend.id
  rest_api_id   = aws_api_gateway_rest_api.backend.id
  stage_name    = var.environment

  tags = {
    Name        = "${var.app_name}-${var.environment}-stage"
    Environment = var.environment
    Application = var.app_name
  }
}

# Custom domain (optional)
resource "aws_api_gateway_domain_name" "backend" {
  count           = var.custom_domain_name != "" ? 1 : 0
  domain_name     = var.custom_domain_name
  certificate_arn = var.acm_certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-domain"
    Environment = var.environment
    Application = var.app_name
  }
}

# Base path mapping for custom domain
resource "aws_api_gateway_base_path_mapping" "backend" {
  count       = var.custom_domain_name != "" ? 1 : 0
  api_id      = aws_api_gateway_rest_api.backend.id
  stage_name  = aws_api_gateway_stage.backend.stage_name
  domain_name = aws_api_gateway_domain_name.backend[0].domain_name
}

# Route53 record for custom domain
resource "aws_route53_record" "backend" {
  count   = var.custom_domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.custom_domain_name
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.backend[0].cloudfront_domain_name
    zone_id                = aws_api_gateway_domain_name.backend[0].cloudfront_zone_id
    evaluate_target_health = false
  }
}