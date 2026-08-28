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

resource "aws_iam_role_policy" "deploy" {
  name = "${var.name}-github-actions-deploy"
  role = aws_iam_role.deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
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
        Action = "s3:GetObject"
        # Exact key, not a prefix wildcard: "chardb/environments/dev*" would
        # also match a future "chardb/environments/dev-anything".
        Resource = "arn:${data.aws_partition.current.partition}:s3:::${var.terraform_state_bucket}/${var.terraform_state_key}"
      },
      {
        Sid      = "ListTerraformStateBucket"
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = "arn:${data.aws_partition.current.partition}:s3:::${var.terraform_state_bucket}"
        Condition = {
          StringEquals = {
            "s3:prefix" = [var.terraform_state_key]
          }
        }
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
        # `aws s3 sync --delete` needs to enumerate the bucket to work out what
        # to remove.
        Action   = "s3:ListBucket"
        Resource = var.frontend_bucket_arn
      },
      {
        Sid      = "InvalidateFrontendCache"
        Effect   = "Allow"
        Action   = "cloudfront:CreateInvalidation"
        Resource = var.frontend_cloudfront_distribution_arn
      },
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
          # Forces AWS to check the document as well as the instance. Without
          # it, the instance ARN alone authorises a session with any document.
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
        # ${aws:userid} resolves to the role id plus this job's session name, so
        # a job can only tear down the sessions it opened.
        Resource = "arn:${data.aws_partition.current.partition}:ssm:*:*:session/$${aws:userid}-*"
      }
    ]
  })
}
