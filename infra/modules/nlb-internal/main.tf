/**
 * Network Load Balancer Module
 *
 * Creates an NLB for ECS Fargate services.
 */

# Security Group for NLB
resource "aws_security_group" "nlb" {
  name_prefix = "${var.name_prefix}-nlb-"
  description = "Security group for internal NLB"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-nlb-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Allow HTTPS from CloudFront (all IPs, as CloudFront has many IP ranges)
# In practice, CloudFront VPC Origin will add custom headers for security
resource "aws_vpc_security_group_ingress_rule" "https" {
  security_group_id = aws_security_group.nlb.id

  description = "Allow HTTPS from anywhere (CloudFront VPC Origin)"
  from_port   = 443
  to_port     = 443
  ip_protocol = "tcp"
  cidr_ipv4   = "0.0.0.0/0"
}

# Allow HTTP (for health checks or HTTP redirect)
resource "aws_vpc_security_group_ingress_rule" "http" {
  count = var.enable_http_listener ? 1 : 0

  security_group_id = aws_security_group.nlb.id

  description = "Allow HTTP"
  from_port   = 80
  to_port     = 80
  ip_protocol = "tcp"
  cidr_ipv4   = "0.0.0.0/0"
}

# Allow all egress (NLB needs to reach targets)
resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.nlb.id

  description = "Allow all outbound"
  ip_protocol = "-1"
  cidr_ipv4   = "0.0.0.0/0"
}

# Network Load Balancer
resource "aws_lb" "nlb" {
  name               = "${var.name_prefix}-nlb"
  internal           = false
  load_balancer_type = "network"
  subnets            = var.subnet_ids

  enable_deletion_protection       = var.enable_deletion_protection
  enable_cross_zone_load_balancing = var.enable_cross_zone_load_balancing

  # NLB doesn't support security groups directly in all regions/scenarios
  # We'll attach via ENIs implicitly, but also use target group settings
  security_groups = [aws_security_group.nlb.id]

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-nlb"
    }
  )
}

# Target Group for ECS Service
resource "aws_lb_target_group" "ecs" {
  name        = "${var.name_prefix}-tg"
  port        = var.target_port
  protocol    = var.target_protocol
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = var.health_check_healthy_threshold
    unhealthy_threshold = var.health_check_unhealthy_threshold
    interval            = var.health_check_interval
    path                = var.health_check_path
    protocol            = var.health_check_protocol
    matcher             = var.health_check_matcher
    timeout             = var.health_check_timeout
  }

  deregistration_delay = var.deregistration_delay

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-tg"
    }
  )
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.nlb.arn
  port              = 443
  protocol          = "TLS"
  certificate_arn   = var.certificate_arn
  ssl_policy        = var.ssl_policy
  alpn_policy       = var.alpn_policy

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ecs.arn
  }

  tags = var.tags
}

# HTTP Listener (optional, for HTTP to HTTPS redirect or direct HTTP)
resource "aws_lb_listener" "http" {
  count = var.enable_http_listener ? 1 : 0

  load_balancer_arn = aws_lb.nlb.arn
  port              = 80
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ecs.arn
  }

  tags = var.tags
}
