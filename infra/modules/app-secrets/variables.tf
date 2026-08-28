variable "project_name" {
  description = "Project name; forms the first segment of the parameter path"
  type        = string
}

variable "environment" {
  description = "Environment name; forms the second segment of the parameter path"
  type        = string
}

variable "unmanaged_secrets" {
  description = <<-EOT
    Secrets whose value Terraform must never manage, as a map of parameter name
    to description. Created with `placeholder_value` and then ignored, so the
    real value is set out of band and rotating it produces no plan diff.
  EOT
  type        = map(string)
  default     = {}
}

variable "placeholder_value" {
  description = "Initial value written to unmanaged parameters, then ignored"
  type        = string
  default     = "not-managed-by-terraform"
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}
