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

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Production prunes old assets at the end; check for its tools before
# uploading anything.
source "$SCRIPT_DIR/lib/frontend-asset-retention.sh"
if [ "$ENVIRONMENT" = "prod" ]; then
    require_retention_tools
fi

# Get terraform outputs for frontend infrastructure
echo "📋 Getting terraform outputs..."

cd "$PROJECT_ROOT/infra/environments/$ENVIRONMENT"

# Get S3 bucket name and CloudFront distribution ID
BUCKET_NAME=$(terraform output -raw frontend_bucket_name)
CLOUDFRONT_DISTRIBUTION_ID=$(terraform output -raw frontend_cloudfront_distribution_id)
WEBSITE_URL=$(terraform output -raw frontend_website_url)

# Before anything prints them, including the AWS CLI itself: `s3 sync` names the
# bucket on every uploaded object and `create-invalidation` echoes the
# distribution id back in its reply, so removing the echoes below would not on
# its own keep either out of a public log (#378).
source "$SCRIPT_DIR/lib/mask-in-actions.sh"
mask_in_actions BUCKET_NAME CLOUDFRONT_DISTRIBUTION_ID

if [ -z "$BUCKET_NAME" ] || [ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo "❌ Missing required terraform outputs"
    # Which output failed to load is the diagnostic; its value is not.
    echo "BUCKET_NAME: ${BUCKET_NAME:+[present]}"
    echo "CLOUDFRONT_DISTRIBUTION_ID: ${CLOUDFRONT_DISTRIBUTION_ID:+[present]}"
    exit 1
fi

# Navigate back to project root
cd "$PROJECT_ROOT"

# Check if build exists
if [ ! -d "apps/frontend/dist" ]; then
    echo "❌ Frontend build not found. Please build first:"
    echo "   ./scripts/build-frontend.sh $ENVIRONMENT <backend_url> <version> <root_domain>"
    exit 1
fi

# Files under assets/ are named after a hash of their contents, so a name never
# comes to mean different bytes: browsers may keep them for good. Everything
# else, index.html above all, is revalidated on every load, because index.html
# is what points at this build's asset names.
#
# The new assets go up before the new index.html, so a visitor mid-deploy never
# meets an index.html whose assets are missing.
echo "📤 Uploading hashed assets to S3..."
aws s3 sync apps/frontend/dist/assets/ s3://$BUCKET_NAME/assets/ \
    --cache-control "public, max-age=31536000, immutable"

if [ "$ENVIRONMENT" = "prod" ]; then
    echo "📝 Recording this build's assets..."
    record_frontend_assets "$BUCKET_NAME" apps/frontend/dist
fi

echo "📤 Uploading index.html and other files to S3..."
aws s3 sync apps/frontend/dist/ s3://$BUCKET_NAME/ \
    --exclude "assets/*" --exclude "${FRONTEND_MANIFEST_PREFIX}*" \
    --cache-control "no-cache" --delete

# Production keeps the last few builds' assets, so a tab opened before this
# deploy can still load the pages it has not visited yet; see
# lib/frontend-asset-retention.sh. Staging deletes them at once: a stale
# staging tab breaking on its next navigation is acceptable there.
if [ "$ENVIRONMENT" = "prod" ]; then
    echo "🧹 Removing assets no recent build uses..."
    prune_frontend_assets "$BUCKET_NAME" 5
else
    echo "🧹 Removing the previous build's assets..."
    aws s3 sync apps/frontend/dist/assets/ s3://$BUCKET_NAME/assets/ --delete \
        --cache-control "public, max-age=31536000, immutable"
fi

# Create CloudFront invalidation
echo "🔄 Creating CloudFront invalidation..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo "⏳ Invalidation created: $INVALIDATION_ID"
# Only worth printing where someone can act on it. In Actions the distribution
# id is masked, so the command would arrive with a `***` in it and help nobody.
if [ -z "${GITHUB_ACTIONS:-}" ]; then
    echo "   You can check status with: aws cloudfront get-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --id $INVALIDATION_ID"
fi

echo "✅ Frontend deployment completed successfully!"
echo "🌐 Website URL: $WEBSITE_URL"
echo ""
echo "📝 Note: CloudFront invalidation may take 5-15 minutes to complete."