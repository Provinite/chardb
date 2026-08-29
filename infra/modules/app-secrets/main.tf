# SecureString parameters whose value Terraform creates once and then never
# reconciles. Set the real value out of band; see DEPLOYMENT_GUIDE.md.

locals {
  # Leading slash: hierarchical names let IAM grant read on the path rather
  # than on each parameter ARN.
  path_prefix = "/${var.project_name}/${var.environment}"
}

resource "aws_ssm_parameter" "unmanaged" {
  for_each = var.unmanaged_secrets

  name        = "${local.path_prefix}/${each.key}"
  description = each.value
  type        = "SecureString"
  value       = var.placeholder_value

  lifecycle {
    # Without this, every apply would overwrite the real secret with the
    # placeholder.
    ignore_changes = [value]
  }

  tags = merge(var.tags, {
    Name           = "${local.path_prefix}/${each.key}"
    ValueManagedBy = "manual"
  })
}
