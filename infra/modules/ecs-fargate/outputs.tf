output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "service_id" {
  description = "ID of the ECS service"
  value       = aws_ecs_service.app.id
}

output "service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.app.name
}

output "task_definition_input" {
  description = <<-EOT
    Complete register-task-definition payload, computed by Terraform from the
    environment, secrets, sizing, roles and logging it owns. A deploy reads
    this, substitutes the released image, and registers a revision. Terraform
    holds no task definition in state, so it never creates a revision nothing
    deploys, and never disagrees with the running one.
  EOT
  value       = jsonencode(local.task_definition_input)
  # Derived from environment variables the caller marks sensitive.
  sensitive = true
}

output "task_definition_family" {
  description = "Family of the task definition"
  value       = "${var.name_prefix}-task"
}

output "task_execution_role_arn" {
  description = "ARN of the task execution role"
  value       = aws_iam_role.task_execution.arn
}

output "task_role_arn" {
  description = "ARN of the task role"
  value       = aws_iam_role.task.arn
}

output "task_role_name" {
  description = "Name of the task role"
  value       = aws_iam_role.task.name
}

output "security_group_id" {
  description = "ID of the ECS tasks security group"
  value       = aws_security_group.ecs_tasks.id
}

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.ecs.name
}

output "log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.ecs.arn
}
