# Application secrets in SSM Parameter Store.
#
# This module exists to break a loop. The OAuth client secrets and bot token
# were declared as Terraform *input variables*, sourced from a gitignored
# .tfvars file, and then re-exported as Terraform *outputs* -- the deploy read
# them back out of state to render the host's .env. So state was the only
# durable record, and the .tfvars file was a hand-maintained cache of Terraform's
# own output. The dev tfvars header records that this already went one full turn:
# "DeviantArt/Discord pulled from terraform state".
#
# The consequences were real: only the one laptop holding .tfvars could apply,
# a secret rotated in Discord's dashboard drifted silently, and re-deriving
# .tfvars from state and re-applying validated nothing because it just fed
# state's values back into state.
#
# Parameter Store over Secrets Manager: Standard-tier parameters are free, where
# Secrets Manager is $0.40 per secret per month (~$8/month across both
# environments here). The features that justify that price -- native rotation
# and resource-based policies -- are unused, and ECS accepts Parameter Store
# ARNs in a task definition's `valueFrom` exactly as it does Secrets Manager
# ARNs. SecureString uses the AWS-managed aws/ssm key, so there is no key charge
# either.
#
# Every parameter here is one Terraform must NOT manage the value of: it comes
# from somewhere Terraform cannot see (Discord's developer portal, DeviantArt's,
# ToyHouse's). Terraform creates the parameter with a placeholder and then
# ignores its value forever. Set the real value out of band, once:
#
#   aws ssm put-parameter --overwrite --type SecureString \
#     --name /chardb/dev/discord-bot-token --value '...'
#
# Rotating it later is the same command, with no Terraform run and no plan diff.
#
# Parameters Terraform genuinely owns -- because Terraform generated the value,
# like an RDS password or a random_password -- deliberately do not belong here.
# A placeholder would break the application. There are only two of them in this
# project and they live as explicit resources next to the thing that generates
# them, in infra/environments/prod/main.tf.

locals {
  # A leading slash makes these hierarchical, which is what lets an IAM policy
  # grant read on /chardb/<env>/* rather than naming every parameter.
  path_prefix = "/${var.project_name}/${var.environment}"
}

resource "aws_ssm_parameter" "unmanaged" {
  for_each = var.unmanaged_secrets

  name        = "${local.path_prefix}/${each.key}"
  description = each.value
  type        = "SecureString"
  value       = var.placeholder_value

  lifecycle {
    # The whole point. Terraform creates the parameter and never touches its
    # value again, so the real secret exists only in Parameter Store -- not in
    # a .tfvars file, not in state, not in a Terraform output.
    ignore_changes = [value]
  }

  tags = merge(var.tags, {
    Name           = "${local.path_prefix}/${each.key}"
    ValueManagedBy = "manual"
  })
}
