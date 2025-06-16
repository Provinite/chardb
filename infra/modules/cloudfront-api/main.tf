# CloudFront distribution for API with HTTP origin
# No caching, just HTTPS termination and custom domain

resource "aws_cloudfront_distribution" "api" {
  origin {
    domain_name = var.backend_public_dns
    origin_id   = "ec2-backend"
    
    custom_origin_config {
      http_port              = var.backend_port
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled = true
  aliases = var.custom_domain_name != "" ? [var.custom_domain_name] : []

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ec2-backend"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    # No caching for API
    cache_policy_id = aws_cloudfront_cache_policy.no_cache.id
    
    # Forward all headers and query strings
    origin_request_policy_id = aws_cloudfront_origin_request_policy.forward_all.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.custom_domain_name == ""
    acm_certificate_arn           = var.custom_domain_name != "" ? var.acm_certificate_arn : null
    ssl_support_method            = var.custom_domain_name != "" ? "sni-only" : null
    minimum_protocol_version      = var.custom_domain_name != "" ? "TLSv1.2_2021" : null
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-api-cdn"
    Environment = var.environment
    Application = var.app_name
  }
}

# Custom cache policy - no caching
resource "aws_cloudfront_cache_policy" "no_cache" {
  name        = "${var.app_name}-${var.environment}-no-cache"
  comment     = "No caching policy for API requests"
  default_ttl = 0
  max_ttl     = 0
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = false
    enable_accept_encoding_gzip   = false
    
    headers_config {
      header_behavior = "none"
    }
    
    query_strings_config {
      query_string_behavior = "none"
    }
    
    cookies_config {
      cookie_behavior = "none"
    }
  }
}

# Custom origin request policy - forward everything
resource "aws_cloudfront_origin_request_policy" "forward_all" {
  name    = "${var.app_name}-${var.environment}-forward-all"
  comment = "Forward all headers, query strings, and cookies to origin"

  headers_config {
    header_behavior = "allViewer"
  }

  query_strings_config {
    query_string_behavior = "all"
  }

  cookies_config {
    cookie_behavior = "all"
  }
}

# Route53 record for custom domain
resource "aws_route53_record" "api" {
  count   = var.custom_domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.custom_domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.api.domain_name
    zone_id                = aws_cloudfront_distribution.api.hosted_zone_id
    evaluate_target_health = false
  }
}