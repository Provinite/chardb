#!/bin/bash

# Build and Push Docker Images Script
# Builds backend Docker image and pushes it to ECR

set -e

# Configuration
ENVIRONMENT=${1:-prod}
IMAGE_TAG=${2:-latest}
AWS_REGION=${AWS_REGION:-us-east-1}

echo "🏗️ Building and pushing images for environment: $ENVIRONMENT, tag: $IMAGE_TAG"

# Get ECR repository URL from Terraform
echo "📋 Getting ECR repository URL from Terraform..."
if ! ECR_REPOSITORY_URL=$(cd "infra/environments/$ENVIRONMENT" && terraform output -raw backend_ecr_repository_url 2>/dev/null); then
    echo "❌ Failed to get ECR repository URL from Terraform"
    echo "Make sure you've run 'terraform apply' first"
    exit 1
fi

# Masked before anything prints it -- `docker build -t` and `docker push` both
# name the repository on their own account, so dropping the echo that used to
# be here would not have kept it out of a public log (#378).
source "$(dirname "$0")/lib/mask-in-actions.sh"
mask_in_actions ECR_REPOSITORY_URL

# Extract AWS account ID from ECR URL
AWS_ACCOUNT_ID=$(echo "$ECR_REPOSITORY_URL" | cut -d'.' -f1 | cut -d'/' -f3)
mask_in_actions AWS_ACCOUNT_ID
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "🏗️ Building ARM64 backend Docker image..."
docker build \
    --platform linux/arm64 \
    -f docker/Dockerfile.backend \
    -t "${ECR_REPOSITORY_URL}:${IMAGE_TAG}" \
    -t "${ECR_REPOSITORY_URL}:latest" \
    .

echo "📤 Pushing images to ECR..."
docker push "${ECR_REPOSITORY_URL}:${IMAGE_TAG}"
docker push "${ECR_REPOSITORY_URL}:latest"

echo "✅ Successfully built and pushed images:"
echo "   Tags: $IMAGE_TAG, latest"
echo ""
echo "🚀 Ready to deploy with:"
echo "   ./deploy.sh $ENVIRONMENT $IMAGE_TAG"