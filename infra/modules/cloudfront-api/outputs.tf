output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.api.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.api.domain_name
}

output "api_url" {
  description = "URL of the API"
  value       = var.custom_domain_name != "" ? "https://${var.custom_domain_name}" : "https://${aws_cloudfront_distribution.api.domain_name}"
}