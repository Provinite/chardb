terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

# Get default VPC
data "aws_vpc" "default" {
  default = true
}

# Get default subnets
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }

  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

# Get the first default subnet
data "aws_subnet" "default" {
  id = data.aws_subnets.default.ids[0]
}

# Get latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

# Security Group
resource "aws_security_group" "docker_host" {
  name        = "${var.name}-docker-host-sg"
  description = "Security group for Docker host"
  vpc_id      = data.aws_vpc.default.id

  # SSH access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_cidr_blocks
  }

  # HTTP/HTTPS (for web applications)
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Common application ports (can be configured during deployment)
  ingress {
    from_port   = 3000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Common application ports"
  }

  # Observability ports (Jaeger, metrics, etc.)
  ingress {
    from_port   = 16686
    to_port     = 16686
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Jaeger UI"
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.name}-docker-host-sg"
  })
}

# IAM role for EC2 instance
resource "aws_iam_role" "docker_host" {
  name = "${var.name}-docker-host-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM policy for ECR access
resource "aws_iam_role_policy" "ecr_access" {
  name = "${var.name}-ecr-access"
  role = aws_iam_role.docker_host.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM instance profile
resource "aws_iam_instance_profile" "docker_host" {
  name = "${var.name}-docker-host-profile"
  role = aws_iam_role.docker_host.name

  tags = var.tags
}

# Generate random passwords for application secrets
resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# Generate SSH key pair
resource "tls_private_key" "docker_host" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Key pair for SSH access
resource "aws_key_pair" "docker_host" {
  key_name   = "${var.name}-docker-host-key"
  public_key = tls_private_key.docker_host.public_key_openssh

  tags = var.tags
}

# Elastic IP
resource "aws_eip" "docker_host" {
  domain = "vpc"

  tags = merge(var.tags, {
    Name = "${var.name}-docker-host-eip"
  })
}

# EC2 Instance
resource "aws_instance" "docker_host" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.docker_host.key_name
  vpc_security_group_ids = [aws_security_group.docker_host.id]
  subnet_id              = data.aws_subnet.default.id
  iam_instance_profile   = aws_iam_instance_profile.docker_host.name

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    db_password = random_password.db_password.result
    jwt_secret  = random_password.jwt_secret.result
    db_host     = var.db_host
    db_name     = var.db_name
    db_user     = var.db_user
  }))

  root_block_device {
    volume_type = "gp3"
    volume_size = var.root_volume_size
    encrypted   = true
  }

  tags = merge(var.tags, {
    Name = "${var.name}-docker-host"
  })
}

# Associate Elastic IP with instance
resource "aws_eip_association" "docker_host" {
  instance_id   = aws_instance.docker_host.id
  allocation_id = aws_eip.docker_host.id
}

# Network Load Balancer for API Gateway VPC Link
resource "aws_lb" "docker_host" {
  count              = var.enable_api_gateway ? 1 : 0
  name               = "${var.name}-nlb"
  internal           = true
  load_balancer_type = "network"
  subnets            = data.aws_subnets.default.ids

  enable_deletion_protection = false

  tags = merge(var.tags, {
    Name = "${var.name}-nlb"
  })
}

# Target group for backend service
resource "aws_lb_target_group" "backend" {
  count    = var.enable_api_gateway ? 1 : 0
  name     = "${var.name}-backend-tg"
  port     = var.backend_port
  protocol = "TCP"
  vpc_id   = data.aws_vpc.default.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = merge(var.tags, {
    Name = "${var.name}-backend-tg"
  })
}

# Attach EC2 instance to target group
resource "aws_lb_target_group_attachment" "backend" {
  count            = var.enable_api_gateway ? 1 : 0
  target_group_arn = aws_lb_target_group.backend[0].arn
  target_id        = aws_instance.docker_host.id
  port             = var.backend_port
}

# Listener for NLB
resource "aws_lb_listener" "backend" {
  count             = var.enable_api_gateway ? 1 : 0
  load_balancer_arn = aws_lb.docker_host[0].arn
  port              = var.backend_port
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend[0].arn
  }

  tags = merge(var.tags, {
    Name = "${var.name}-backend-listener"
  })
}
