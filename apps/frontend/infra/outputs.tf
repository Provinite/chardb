output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = module.frontend_static_site.bucket_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = module.frontend_static_site.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = module.frontend_static_site.cloudfront_domain_name
}

output "website_url" {
  description = "URL of the website"
  value       = module.frontend_static_site.website_url
}

output "deployment_bucket_name" {
  description = "S3 bucket name for deployment scripts"
  value       = module.frontend_static_site.deployment_bucket_name
}