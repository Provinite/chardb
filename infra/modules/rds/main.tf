/**
 * RDS PostgreSQL Module
 *
 * Creates an RDS PostgreSQL instance with security best practices.
 * Supports single-AZ and multi-AZ deployments with configurable specs.
 */

# Generate random password for database
resource "random_password" "db_password" {
  length  = 32
  special = true
  # Exclude characters that might cause issues in connection strings
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "${var.name_prefix}-rds-sg-"
  description = "Security group for RDS PostgreSQL instance"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-rds-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Note: Ingress rules from ECS are created in the environment's main.tf
# to avoid circular dependencies

# Allow PostgreSQL from management IPs (optional)
resource "aws_vpc_security_group_ingress_rule" "rds_from_management" {
  count = length(var.management_cidr_blocks) > 0 ? length(var.management_cidr_blocks) : 0

  security_group_id = aws_security_group.rds.id

  description = "PostgreSQL from management IP ${count.index + 1}"
  from_port   = 5432
  to_port     = 5432
  ip_protocol = "tcp"
  cidr_ipv4   = var.management_cidr_blocks[count.index]
}

# IAM Role for Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  name               = "${var.name_prefix}-rds-monitoring-role"
  assume_role_policy = data.aws_iam_policy_document.rds_monitoring_assume[0].json

  tags = var.tags
}

data "aws_iam_policy_document" "rds_monitoring_assume" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["monitoring.rds.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# DB Parameter Group
resource "aws_db_parameter_group" "postgres" {
  count = var.create_parameter_group ? 1 : 0

  name   = "${var.name_prefix}-postgres-params"
  family = var.parameter_group_family

  dynamic "parameter" {
    for_each = var.parameters
    content {
      name  = parameter.value.name
      value = parameter.value.value
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-postgres-params"
    }
  )
}

# RDS Instance
resource "aws_db_instance" "postgres" {
  identifier = "${var.name_prefix}-postgres"

  # Engine
  engine         = "postgres"
  engine_version = var.engine_version

  # Instance Configuration
  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage
  storage_type      = var.storage_type
  storage_encrypted = true
  iops              = var.storage_type == "io1" || var.storage_type == "io2" ? var.iops : null

  # Database Configuration
  db_name  = var.database_name
  username = var.master_username
  password = random_password.db_password.result
  port     = 5432

  # Networking
  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = var.publicly_accessible

  # Multi-AZ
  multi_az = var.multi_az

  # Backup
  backup_retention_period = var.backup_retention_period
  backup_window           = var.backup_window
  maintenance_window      = var.maintenance_window
  skip_final_snapshot     = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.name_prefix}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  # Monitoring
  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports
  monitoring_interval             = var.enable_enhanced_monitoring ? var.monitoring_interval : 0
  monitoring_role_arn             = var.enable_enhanced_monitoring ? aws_iam_role.rds_monitoring[0].arn : null

  # Performance Insights
  performance_insights_enabled    = var.performance_insights_enabled
  performance_insights_kms_key_id = var.performance_insights_kms_key_id

  # Parameter Group
  parameter_group_name = var.create_parameter_group ? aws_db_parameter_group.postgres[0].name : var.parameter_group_name

  # Auto minor version upgrade
  auto_minor_version_upgrade = var.auto_minor_version_upgrade

  # Deletion protection
  deletion_protection = var.deletion_protection

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-postgres"
    }
  )

  lifecycle {
    ignore_changes = [
      final_snapshot_identifier,
    ]
  }
}
