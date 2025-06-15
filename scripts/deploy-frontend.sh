#!/bin/bash

# Frontend S3 Deployment Script
# This script deploys the built frontend to S3 and invalidates CloudFront cache

set -e

# Configuration
ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
    echo "❌ Environment is required"
    echo "Usage: $0 <environment>"
    echo "Example: $0 prod"
    exit 1
fi

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo "❌ Environment must be 'dev' or 'prod'"
    exit 1
fi

echo "🚀 Deploying frontend to S3 (environment: $ENVIRONMENT)"

# Validate AWS CLI is available and configured
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Test AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

# Get terraform outputs for frontend infrastructure
echo "📋 Getting terraform outputs..."
cd "$(dirname "$0")/../infra/environments/$ENVIRONMENT"

# Check if terraform state exists
if [ ! -f "terraform.tfstate" ]; then
    echo "❌ Terraform state not found. Please deploy infrastructure first:"
    echo "   cd infra/environments/$ENVIRONMENT && terraform init && terraform apply"
    exit 1
fi

# Get S3 bucket name and CloudFront distribution ID
BUCKET_NAME=$(terraform output -raw frontend_bucket_name)
CLOUDFRONT_DISTRIBUTION_ID=$(terraform output -raw frontend_cloudfront_distribution_id)
WEBSITE_URL=$(terraform output -raw frontend_website_url)

if [ -z "$BUCKET_NAME" ] || [ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo "❌ Missing required terraform outputs"
    echo "BUCKET_NAME: $BUCKET_NAME"
    echo "CLOUDFRONT_DISTRIBUTION_ID: $CLOUDFRONT_DISTRIBUTION_ID"
    exit 1
fi

echo "📁 S3 Bucket: $BUCKET_NAME"
echo "🌐 CloudFront Distribution: $CLOUDFRONT_DISTRIBUTION_ID"

# Navigate back to project root
cd "$(dirname "$0")/.."

# Check if build exists
if [ ! -d "apps/frontend/dist" ]; then
    echo "❌ Frontend build not found. Please build first:"
    echo "   ./scripts/build-frontend.sh $ENVIRONMENT <backend_url>"
    exit 1
fi

# Sync all files to S3 (CloudFront handles caching)
echo "📤 Uploading all files to S3..."
aws s3 sync apps/frontend/dist/ s3://$BUCKET_NAME/ --delete

# Create CloudFront invalidation
echo "🔄 Creating CloudFront invalidation..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo "⏳ Invalidation created: $INVALIDATION_ID"
echo "   You can check status with: aws cloudfront get-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --id $INVALIDATION_ID"

echo "✅ Frontend deployment completed successfully!"
echo "🌐 Website URL: $WEBSITE_URL"
echo ""
echo "📝 Note: CloudFront invalidation may take 5-15 minutes to complete."