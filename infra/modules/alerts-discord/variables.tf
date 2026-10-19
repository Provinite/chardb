variable "project_name" {
  description = "Project name; forms the first segment of resource names and the parameter path"
  type        = string
}

variable "environment" {
  description = "Environment name; forms the second segment of resource names and the parameter path"
  type        = string
}

variable "placeholder_value" {
  description = "Initial value written to the webhook URL parameter, then ignored"
  type        = string
  default     = "not-managed-by-terraform"
}

variable "tags" {
  description = "A map of tags to assign to the resources"
  type        = map(string)
  default     = {}
}
