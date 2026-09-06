terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# S3 bucket for static website hosting
resource "aws_s3_bucket" "static_site" {
  bucket = var.bucket_name

  tags = var.tags
}

# S3 bucket versioning
resource "aws_s3_bucket_versioning" "static_site" {
  bucket = aws_s3_bucket.static_site.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access (CloudFront will access via OAC)
resource "aws_s3_bucket_public_access_block" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "static_site" {
  name                              = "${var.name}-oac"
  description                       = "OAC for ${var.name} static site"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "static_site" {
  origin {
    domain_name              = aws_s3_bucket.static_site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.static_site.id
    origin_id                = "S3-${var.bucket_name}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.name} static site distribution"
  default_root_object = var.default_root_object

  # Configure aliases if custom domain is provided.
  #
  # The wildcard alias exists because communities are addressed by subdomain
  # (willowmere.chardb.cc). They are not separate sites: every one of them is
  # this same bundle, which reads the hostname to decide which community it is
  # showing. One distribution therefore serves all of them, and no per-community
  # infrastructure has to be created when a community is.
  aliases = var.domain_name != null ? (
    var.serve_wildcard_subdomains ? [var.domain_name, "*.${var.domain_name}"] : [var.domain_name]
  ) : []

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${var.bucket_name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = var.default_ttl
    max_ttl     = var.max_ttl
  }

  # Cache behavior for static assets (CSS, JS, images) - Vite uses /assets/*
  ordered_cache_behavior {
    path_pattern           = "/assets/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "S3-${var.bucket_name}"
    compress               = true
    viewer_protocol_policy = "https-only"

    forwarded_values {
      query_string = false
      headers      = ["Origin"]
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = var.default_ttl  # Use environment-specific setting
    max_ttl     = var.max_ttl      # Use environment-specific setting
  }


  price_class = var.price_class

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Use ACM certificate if provided
  dynamic "viewer_certificate" {
    for_each = var.acm_certificate_arn != null ? [1] : []
    content {
      acm_certificate_arn      = var.acm_certificate_arn
      ssl_support_method       = "sni-only"
      minimum_protocol_version = "TLSv1.2_2021"
    }
  }

  # Use default CloudFront certificate if no custom certificate
  dynamic "viewer_certificate" {
    for_each = var.acm_certificate_arn == null ? [1] : []
    content {
      cloudfront_default_certificate = true
    }
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  tags = var.tags
}

# S3 bucket policy to allow CloudFront access
resource "aws_s3_bucket_policy" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.static_site.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.static_site.arn
          }
        }
      }
    ]
  })
}

# Route53 record (if hosted zone is provided)
resource "aws_route53_record" "static_site" {
  count = var.route53_zone_id != null && var.domain_name != null ? 1 : 0

  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.static_site.domain_name
    zone_id                = aws_cloudfront_distribution.static_site.hosted_zone_id
    evaluate_target_health = false
  }
}

# Wildcard record for community subdomains.
#
# Communities are created in the app, not in Terraform, so their hostnames
# cannot be enumerated here -- this record answers for all of them at once.
# Route53 prefers an exact match over a wildcard, so siblings that already have
# their own record (api, images) keep pointing where they do.
resource "aws_route53_record" "static_site_wildcard" {
  count = var.serve_wildcard_subdomains && var.route53_zone_id != null && var.domain_name != null ? 1 : 0

  zone_id = var.route53_zone_id
  name    = "*.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.static_site.domain_name
    zone_id                = aws_cloudfront_distribution.static_site.hosted_zone_id
    evaluate_target_health = false
  }
}