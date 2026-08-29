variable "name" {
  description = "Name prefix for the deploy role"
  type        = string
}

variable "github_repository" {
  description = "GitHub repository allowed to assume the role, as owner/name"
  type        = string
}

variable "allowed_refs" {
  description = "Git refs whose jobs may assume the role, e.g. \"refs/heads/main\""
  type        = list(string)
  default     = []
}

variable "allowed_environments" {
  description = "GitHub environment names whose jobs may assume the role"
  type        = list(string)
  default     = []
}

variable "required_ref" {
  description = <<-EOT
    Ref a job must additionally be running on, e.g. "refs/heads/main". Pair this
    with allowed_environments: an environment subject alone does not constrain
    which branch deployed to it.
  EOT
  type        = string
  default     = null
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

variable "terraform_state_key" {
  description = "Exact object key of this environment's Terraform state"
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
  description = <<-EOT
    ARN of the EC2 instance the workflow opens a Session Manager tunnel to.
    Null for environments with no docker host, which omits the SSM grants.
  EOT
  type        = string
  default     = null
}

variable "ecs_service_arn" {
  description = <<-EOT
    ARN of the ECS service the workflow deploys to. Null for environments with
    no ECS service, which omits the ECS grants.
  EOT
  type        = string
  default     = null
}

variable "ecs_task_definition_family_arn_pattern" {
  description = "ARN pattern matching every revision of the task definition family"
  type        = string
  default     = null
}

variable "ecr_pull_repository_arns" {
  description = <<-EOT
    Repositories the workflow may pull from, for promoting an image built in
    another environment. Pull only -- it can never push to these.
  EOT
  type        = list(string)
  default     = []
}

variable "ecs_pass_role_arns" {
  description = <<-EOT
    Task and execution role ARNs the workflow may reference when registering a
    task definition. Scope this tightly: a broad iam:PassRole lets a caller
    attach any role to a task it launches.
  EOT
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}
