output "distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.images.id
}

output "distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.images.arn
}

output "distribution_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.images.domain_name
}

output "custom_domain_name" {
  description = "Custom domain name (if configured)"
  value       = var.domain_name
}

output "oac_id" {
  description = "ID of the Origin Access Control"
  value       = aws_cloudfront_origin_access_control.images.id
}
