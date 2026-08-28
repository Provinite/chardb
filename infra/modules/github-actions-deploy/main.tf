# Federated identity for GitHub Actions.
#
# The deploy workflow assumes this role through OIDC rather than holding an
# access key. The repository is public, so a long-lived credential in repo
# secrets would be one misconfigured workflow away from exfiltration; a
# federated token is minted per job, expires with it, and is bound to the
# repository and ref in the trust policy below.

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_partition" "current" {}

locals {
  oidc_provider_url = "token.actions.githubusercontent.com"
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${local.oidc_provider_url}"

  allowed_subjects = [
    for ref in var.allowed_refs : "repo:${var.github_repository}:ref:${ref}"
  ]
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
        Condition = {
          StringEquals = {
            "${local.oidc_provider_url}:aud" = "sts.amazonaws.com"
            # Pinning `sub` to specific refs is what stops a fork's pull request
            # -- or any other workflow in the repo -- from assuming this role.
            "${local.oidc_provider_url}:sub" = local.allowed_subjects
          }
        }
      }
    ]
  })

  tags = var.tags
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
        # Read-only on purpose: the deploy resolves its targets from state but
        # must never be able to modify infrastructure. `terraform apply` stays a
        # human action.
        Action   = "s3:GetObject"
        Resource = "arn:${data.aws_partition.current.partition}:s3:::${var.terraform_state_bucket}/${var.terraform_state_key_prefix}*"
      },
      {
        Sid      = "ListTerraformStateBucket"
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = "arn:${data.aws_partition.current.partition}:s3:::${var.terraform_state_bucket}"
        Condition = {
          StringLike = {
            "s3:prefix" = ["${var.terraform_state_key_prefix}*"]
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
