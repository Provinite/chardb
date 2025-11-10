terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Origin Access Control for S3 bucket
resource "aws_cloudfront_origin_access_control" "images" {
  name                              = "${var.environment}-images-oac"
  description                       = "OAC for ${var.environment} image bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Cache policy optimized for images
resource "aws_cloudfront_cache_policy" "images" {
  name        = "${var.environment}-images-cache-policy"
  comment     = "Cache policy optimized for images"
  default_ttl = 86400   # 1 day
  max_ttl     = 31536000 # 1 year
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# CloudFront distribution for images
resource "aws_cloudfront_distribution" "images" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.environment} image CDN"
  default_root_object = ""
  price_class         = "PriceClass_100" # US, Canada, Europe
  aliases             = var.domain_name != null ? [var.domain_name] : []

  origin {
    domain_name              = var.s3_bucket_regional_domain_name
    origin_id                = "S3-${var.s3_bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.images.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${var.s3_bucket_name}"
    cache_policy_id        = aws_cloudfront_cache_policy.images.id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # Custom error response for missing images
  custom_error_response {
    error_code         = 403
    response_code      = 404
    response_page_path = ""
  }

  # Viewer certificate configuration
  dynamic "viewer_certificate" {
    for_each = var.acm_certificate_arn != null ? [1] : []
    content {
      acm_certificate_arn      = var.acm_certificate_arn
      ssl_support_method       = "sni-only"
      minimum_protocol_version = "TLSv1.2_2021"
    }
  }

  dynamic "viewer_certificate" {
    for_each = var.acm_certificate_arn == null ? [1] : []
    content {
      cloudfront_default_certificate = true
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Name        = "${var.environment}-images-cdn"
    Environment = var.environment
    Purpose     = "image-delivery"
  }
}

# Route53 A record for custom domain
resource "aws_route53_record" "images" {
  count   = var.domain_name != null && var.route53_zone_id != null ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.images.domain_name
    zone_id                = aws_cloudfront_distribution.images.hosted_zone_id
    evaluate_target_health = false
  }
}

# AAAA record for IPv6
resource "aws_route53_record" "images_ipv6" {
  count   = var.domain_name != null && var.route53_zone_id != null ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.images.domain_name
    zone_id                = aws_cloudfront_distribution.images.hosted_zone_id
    evaluate_target_health = false
  }
}
