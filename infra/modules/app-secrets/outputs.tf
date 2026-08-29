output "path_prefix" {
  description = "Parameter path prefix these secrets live under"
  value       = local.path_prefix
}

output "arns" {
  description = "Map of secret key to parameter ARN, for task definitions"
  value       = { for k, v in aws_ssm_parameter.unmanaged : k => v.arn }
}

output "names" {
  description = "Map of secret key to full parameter name"
  value       = { for k, v in aws_ssm_parameter.unmanaged : k => v.name }
}

output "arn_list" {
  description = "All parameter ARNs, for IAM policy resource lists"
  value       = [for v in aws_ssm_parameter.unmanaged : v.arn]
}

# A wildcard on the path rather than a list of ARNs: adding a secret later then
# needs no IAM change, and the grant stays readable in the console.
output "path_arn_wildcard" {
  description = "ARN pattern matching every parameter under this path"
  value       = "arn:aws:ssm:*:*:parameter${local.path_prefix}/*"
}
