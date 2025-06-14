output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.static_site.bucket
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.static_site.arn
}

output "bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.static_site.bucket_domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.static_site.id
}

output "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.static_site.arn
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.static_site.domain_name
}

output "website_url" {
  description = "URL of the website"
  value       = var.domain_name != null ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.static_site.domain_name}"
}

output "deployment_bucket_name" {
  description = "S3 bucket name for deployment scripts"
  value       = aws_s3_bucket.static_site.bucket
}

output "cloudfront_distribution_tags" {
  description = "Tags applied to the CloudFront distribution"
  value       = aws_cloudfront_distribution.static_site.tags_all
}