data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_partition" "current" {}

locals {
  oidc_provider_url = "token.actions.githubusercontent.com"
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${local.oidc_provider_url}"

  allowed_subjects = concat(
    [for r in var.allowed_refs : "repo:${var.github_repository}:ref:${r}"],
    [for e in var.allowed_environments : "repo:${var.github_repository}:environment:${e}"],
  )

  trust_conditions = merge(
    {
      "${local.oidc_provider_url}:aud" = "sts.amazonaws.com"
      "${local.oidc_provider_url}:sub" = local.allowed_subjects
    },
    # An environment subject says nothing about which branch deployed to it, so
    # without this any branch targeting the environment could assume the role.
    var.required_ref == null ? {} : {
      "${local.oidc_provider_url}:ref" = var.required_ref
    },
  )
}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url            = "https://${local.oidc_provider_url}"
  client_id_list = ["sts.amazonaws.com"]

  # IAM validates this provider against its own trust store and ignores the
  # thumbprint, but the API still requires the field to be non-empty.
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = var.tags
}

resource "aws_iam_role" "deploy" {
  name = "${var.name}-github-actions-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = local.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        # Pinning `sub` is what stops a fork's pull request -- or any other
        # workflow in the repo -- from assuming this role.
        Condition = {
          StringEquals = local.trust_conditions
        }
      }
    ]
  })

  tags = var.tags

  lifecycle {
    precondition {
      condition     = length(local.allowed_subjects) > 0
      error_message = "Set allowed_refs or allowed_environments; otherwise nothing constrains who may assume this role."
    }
  }
}

locals {
  base_statements = [
    {
      Sid    = "EcrLogin"
      Effect = "Allow"
      # GetAuthorizationToken is account-scoped and cannot name a repository.
      Action   = "ecr:GetAuthorizationToken"
      Resource = "*"
    },
    {
      Sid    = "EcrPushBackendImage"
      Effect = "Allow"
      Action = [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeImages",
        "ecr:GetDownloadUrlForLayer",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ]
      Resource = var.ecr_repository_arn
    },
    {
      Sid    = "ReadTerraformState"
      Effect = "Allow"
      # Read-only: the deploy resolves its targets from state and must not be
      # able to change infrastructure.
      Action   = "s3:GetObject"
      Resource = "arn:${data.aws_partition.current.partition}:s3:::${var.terraform_state_bucket}/${var.terraform_state_key}"
    },
    {
      Sid    = "ListTerraformStateBucket"
      Effect = "Allow"
      Action = "s3:ListBucket"
      # Unconditioned: `terraform init` enumerates workspaces with prefix
      # "env:/", so a prefix condition naming only this environment fails init.
      Resource = "arn:${data.aws_partition.current.partition}:s3:::${var.terraform_state_bucket}"
    },
    {
      Sid    = "PublishFrontend"
      Effect = "Allow"
      Action = [
        "s3:DeleteObject",
        "s3:GetObject",
        "s3:PutObject"
      ]
      Resource = "${var.frontend_bucket_arn}/*"
    },
    {
      Sid    = "ListFrontendBucket"
      Effect = "Allow"
      # `aws s3 sync --delete` enumerates the bucket to work out what to remove.
      Action   = "s3:ListBucket"
      Resource = var.frontend_bucket_arn
    },
    {
      Sid      = "InvalidateFrontendCache"
      Effect   = "Allow"
      Action   = "cloudfront:CreateInvalidation"
      Resource = var.frontend_cloudfront_distribution_arn
    },
  ]

  # Pull-only access to another environment's repository, so a release can
  # promote the exact image staging ran rather than rebuilding it. Rebuilding
  # produces a different artifact: different layer digests, and any unpinned
  # transitive dependency can resolve differently.
  _pull_all = [
    {
      Sid    = "PullImageForPromotion"
      Effect = "Allow"
      Action = [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:DescribeImages",
        "ecr:GetDownloadUrlForLayer"
      ]
      Resource = var.ecr_pull_repository_arns
    },
  ]

  # Only for environments with a docker host reached over SSM. A filtered for
  # rather than a ternary: both branches of a ternary must share a type, and
  # an empty tuple is not the same type as a populated one.
  _ssm_all = [
    {
      Sid    = "OpenSessionManagerTunnel"
      Effect = "Allow"
      Action = "ssm:StartSession"
      Resource = [
        var.docker_host_instance_arn,
        # SSH over SSM runs through this AWS-owned document.
        "arn:${data.aws_partition.current.partition}:ssm:${data.aws_region.current.name}::document/AWS-StartSSHSession"
      ]
      Condition = {
        # Forces AWS to check the document as well as the instance.
        BoolIfExists = {
          "ssm:SessionDocumentAccessCheck" = "true"
        }
      }
    },
    {
      Sid    = "CloseOwnSessions"
      Effect = "Allow"
      Action = [
        "ssm:ResumeSession",
        "ssm:TerminateSession"
      ]
      Resource = "arn:${data.aws_partition.current.partition}:ssm:*:*:session/$${aws:userid}-*"
    },
  ]

  # Only for environments deployed as an ECS service. The workflow reads the
  # revision Terraform last created, swaps the image, registers a new revision
  # and rolls the service onto it.
  _ecs_all = [
    {
      Sid    = "ReadTaskDefinitions"
      Effect = "Allow"
      # DescribeTaskDefinition and RegisterTaskDefinition take no resource.
      Action = [
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition"
      ]
      Resource = "*"
    },
    {
      Sid    = "DeployEcsService"
      Effect = "Allow"
      Action = [
        "ecs:DescribeServices",
        "ecs:UpdateService"
      ]
      Resource = var.ecs_service_arn
    },
    {
      Sid    = "PassTaskRoles"
      Effect = "Allow"
      # Required to register a task definition naming these roles. Scoped to
      # exactly the two: a broad iam:PassRole would let this role attach any
      # role to a task it launches, which is a privilege-escalation path.
      Action   = "iam:PassRole"
      Resource = var.ecs_pass_role_arns
      Condition = {
        StringEquals = {
          "iam:PassedToService" = "ecs-tasks.amazonaws.com"
        }
      }
    },
  ]
  pull_statements = [for st in local._pull_all : st if length(var.ecr_pull_repository_arns) > 0]
  ssm_statements  = [for st in local._ssm_all : st if var.docker_host_instance_arn != null]
  ecs_statements  = [for st in local._ecs_all : st if var.ecs_service_arn != null]
}

resource "aws_iam_role_policy" "deploy" {
  name = "${var.name}-github-actions-deploy"
  role = aws_iam_role.deploy.id

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = concat(local.base_statements, local.pull_statements, local.ssm_statements, local.ecs_statements)
  })
}
