# $schema: https://raw.githubusercontent.com/hashicorp/terraform/main/schemas/providers/aws.json

# API Gateway for EC2 backend with SSL termination
# Provides HTTPS endpoint that proxies to EC2 instance

# CloudWatch log group for API Gateway logs
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.app_name}-${var.environment}"
  retention_in_days = 7

  tags = {
    Name        = "${var.app_name}-${var.environment}-api-logs"
    Environment = var.environment
    Application = var.app_name
  }
}

# IAM role for API Gateway logging
resource "aws_iam_role" "api_gateway_logging" {
  name = "${var.app_name}-${var.environment}-api-gateway-logging"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.app_name}-${var.environment}-api-gateway-logging"
    Environment = var.environment
    Application = var.app_name
  }
}

# IAM policy for API Gateway to write to CloudWatch
resource "aws_iam_role_policy" "api_gateway_logging" {
  name = "${var.app_name}-${var.environment}-api-gateway-logging"
  role = aws_iam_role.api_gateway_logging.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents",
          "logs:GetLogEvents",
          "logs:FilterLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# API Gateway account settings for logging
resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_logging.arn
}

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

# Note: Using direct HTTP integration to EC2 public endpoint
# This avoids the need for VPC Link + Load Balancer for single instance

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

# Direct HTTP integration with EC2 public endpoint
resource "aws_api_gateway_integration" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.backend.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method

  integration_http_method = "ANY"
  type                    = "HTTP_PROXY"
  uri                     = "http://${var.backend_public_dns}:${var.backend_port}"
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
  uri                     = "http://${var.backend_public_dns}:${var.backend_port}/"
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

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      error_message  = "$context.error.message"
      error_type     = "$context.error.responseType"
      integrationRequestId = "$context.integration.requestId"
      integrationStatus    = "$context.integration.status"
      integrationLatency   = "$context.integration.latency"
      responseLatency      = "$context.responseLatency"
    })
  }

  xray_tracing_enabled = true


  tags = {
    Name        = "${var.app_name}-${var.environment}-stage"
    Environment = var.environment
    Application = var.app_name
  }
}

# Custom domain (optional)
resource "aws_api_gateway_domain_name" "backend" {
  count                    = var.custom_domain_name != "" ? 1 : 0
  domain_name              = var.custom_domain_name
  regional_certificate_arn = var.acm_certificate_arn

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
    name                   = aws_api_gateway_domain_name.backend[0].regional_domain_name
    zone_id                = aws_api_gateway_domain_name.backend[0].regional_zone_id
    evaluate_target_health = false
  }
}
