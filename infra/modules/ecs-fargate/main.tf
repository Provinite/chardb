/**
 * ECS Fargate Module
 *
 * Creates an ECS cluster with Fargate tasks for running containerized applications.
 * Includes task definitions, IAM roles, security groups, and CloudWatch logging.
 */

# ECS Cluster with Container Insights
resource "aws_ecs_cluster" "main" {
  name = "${var.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = var.enable_container_insights ? "enabled" : "disabled"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-cluster"
    }
  )
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.name_prefix}"
  retention_in_days = var.log_retention_days

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-ecs-logs"
    }
  )
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "${var.name_prefix}-ecs-tasks-"
  description = "Security group for ECS tasks"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-ecs-tasks-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Allow inbound from NLB security group
resource "aws_vpc_security_group_ingress_rule" "from_nlb" {
  security_group_id = aws_security_group.ecs_tasks.id

  description                  = "Allow traffic from NLB"
  from_port                    = var.container_port
  to_port                      = var.container_port
  ip_protocol                  = "tcp"
  referenced_security_group_id = var.nlb_security_group_id
}

# Allow outbound HTTPS for ECR, AWS APIs, OAuth providers
resource "aws_vpc_security_group_egress_rule" "https" {
  security_group_id = aws_security_group.ecs_tasks.id

  description = "Allow HTTPS outbound"
  from_port   = 443
  to_port     = 443
  ip_protocol = "tcp"
  cidr_ipv4   = "0.0.0.0/0"
}

# Allow outbound HTTP (for potential redirects or non-HTTPS APIs)
resource "aws_vpc_security_group_egress_rule" "http" {
  security_group_id = aws_security_group.ecs_tasks.id

  description = "Allow HTTP outbound"
  from_port   = 80
  to_port     = 80
  ip_protocol = "tcp"
  cidr_ipv4   = "0.0.0.0/0"
}

# Note: Egress rules to RDS are created in the environment's main.tf
# to avoid circular dependencies

# Task Execution Role (for pulling images, writing logs, accessing secrets)
resource "aws_iam_role" "task_execution" {
  name               = "${var.name_prefix}-ecs-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.task_execution_assume.json

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-ecs-task-execution-role"
    }
  )
}

data "aws_iam_policy_document" "task_execution_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Attach AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# On the execution role, not the task role: ECS resolves `secrets` before the
# container starts.
resource "aws_iam_role_policy" "task_execution_secrets" {
  count = length(var.secret_arns) > 0 ? 1 : 0

  name   = "${var.name_prefix}-task-execution-secrets"
  role   = aws_iam_role.task_execution.id
  policy = data.aws_iam_policy_document.task_execution_secrets[0].json
}

data "aws_kms_key" "ssm" {
  key_id = "alias/aws/ssm"
}

data "aws_iam_policy_document" "task_execution_secrets" {
  count = length(var.secret_arns) > 0 ? 1 : 0

  statement {
    actions = [
      "ssm:GetParameters",
    ]
    resources = var.secret_arns
  }

  statement {
    actions   = ["kms:Decrypt"]
    resources = [data.aws_kms_key.ssm.arn]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${var.aws_region}.amazonaws.com"]
    }
  }
}

# Task Role (for application AWS permissions)
resource "aws_iam_role" "task" {
  name               = "${var.name_prefix}-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.task_assume.json

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-ecs-task-role"
    }
  )
}

data "aws_iam_policy_document" "task_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Additional task role policies (required for S3 access)
resource "aws_iam_role_policy" "task_custom" {
  name   = "${var.name_prefix}-task-custom-policy"
  role   = aws_iam_role.task.id
  policy = var.task_role_policy_json
}

# Task Definition
# The task definition is deliberately NOT a Terraform resource.
#
# Deploys register a revision carrying the released image, so a Terraform
# resource here would create a revision on every apply that nothing ever
# deploys -- the service takes whatever the deploy pointed it at. Terraform
# would then hold a task definition in state permanently disagreeing with the
# running one.
#
# Instead Terraform computes the definition and exposes it as an output. It
# still owns the shape -- environment, secrets, sizing, roles, logging -- while
# the deploy owns only the image. See scripts/deploy-prod-release.sh and the
# task_definition_input output.
locals {
  container_definition = {
    name      = var.container_name
    image     = var.container_image
    essential = true

    # hostPort and the three empty lists are what AWS fills in when it
    # normalises a definition. Emitting them keeps a registered revision
    # byte-identical to what the API returns, so successive deploys of the same
    # version produce no spurious difference.
    portMappings = [
      {
        containerPort = var.container_port
        hostPort      = var.container_port
        protocol      = "tcp"
      }
    ]

    mountPoints    = []
    volumesFrom    = []
    systemControls = []

    environment = var.environment_variables
    secrets     = var.secret_variables

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = var.health_check != null ? var.health_check : null
  }

  task_definition_input = {
    family                  = "${var.name_prefix}-task"
    networkMode             = "awsvpc"
    requiresCompatibilities = ["FARGATE"]
    cpu                     = tostring(var.task_cpu)
    memory                  = tostring(var.task_memory)
    executionRoleArn        = aws_iam_role.task_execution.arn
    taskRoleArn             = aws_iam_role.task.arn
    runtimePlatform = {
      operatingSystemFamily = "LINUX"
      cpuArchitecture       = "ARM64"
    }
    containerDefinitions = [local.container_definition]
  }
}

# The revision the service currently runs. Read, never written: this is what
# lets the service be declared without Terraform owning a task definition.
data "aws_ecs_task_definition" "current" {
  task_definition = "${var.name_prefix}-task"
}

# ECS Service
resource "aws_ecs_service" "app" {
  name    = "${var.name_prefix}-service"
  cluster = aws_ecs_cluster.main.id
  # Whatever revision is live. Paired with the ignore_changes below, Terraform
  # neither chooses nor reverts the running revision -- the deploy does.
  task_definition = data.aws_ecs_task_definition.current.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = var.assign_public_ip
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = var.container_name
    container_port   = var.container_port
  }

  lifecycle {
    # desired_count: owned by auto-scaling.
    # task_definition: owned by the deploy, which registers a revision from the
    # one Terraform last created and rolls the service onto it. Without this,
    # the next apply would revert production to an older release.
    #
    # Consequence worth knowing: a task definition change made here does not
    # deploy itself. It lands on the next release, because the deploy derives
    # its revision from Terraform's rather than from the running one.
    ignore_changes = [desired_count, task_definition]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-ecs-service"
    }
  )

  depends_on = [
    aws_iam_role_policy_attachment.task_execution,
  ]
}
