variable "name" {
  description = "Name prefix for the deploy role"
  type        = string
}

variable "github_repository" {
  description = "GitHub repository allowed to assume the role, as owner/name"
  type        = string
}

variable "allowed_refs" {
  description = <<-EOT
    Git refs within the repository allowed to assume the role, in the form
    accepted by the GitHub OIDC `sub` claim (e.g. "refs/heads/main"). Keep this
    tight: any workflow running on a listed ref can deploy.
  EOT
  type        = list(string)
  default     = ["refs/heads/main"]
}

variable "create_oidc_provider" {
  description = <<-EOT
    Whether to create the account-level GitHub OIDC provider. Exactly one
    environment in an AWS account may set this; the rest look it up by ARN.
  EOT
  type        = bool
  default     = true
}

variable "ecr_repository_arn" {
  description = "ARN of the ECR repository the workflow pushes backend images to"
  type        = string
}

variable "terraform_state_bucket" {
  description = "Name of the S3 bucket holding Terraform state, read to resolve deploy targets"
  type        = string
}

variable "terraform_state_key_prefix" {
  description = "Key prefix within the state bucket that the workflow may read"
  type        = string
}

variable "frontend_bucket_arn" {
  description = "ARN of the S3 bucket serving the frontend"
  type        = string
}

variable "frontend_cloudfront_distribution_arn" {
  description = "ARN of the frontend CloudFront distribution, invalidated after each upload"
  type        = string
}

variable "docker_host_instance_arn" {
  description = "ARN of the EC2 instance the workflow opens a Session Manager tunnel to"
  type        = string
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}
