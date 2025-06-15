#!/bin/bash

# ECR Login Script
# Logs into AWS ECR to pull Docker images

set -e

# Get AWS region (default to us-east-1)
AWS_REGION=${AWS_REGION:-us-east-1}

echo "🔐 Logging into ECR in region $AWS_REGION..."

# Extract AWS account ID from ECR repository URL
if [ -z "$ECR_REPOSITORY_URL" ]; then
    echo "❌ ECR_REPOSITORY_URL environment variable is required"
    exit 1
fi

# Extract the registry URL (everything before the first slash)
ECR_REGISTRY_URL=$(echo "$ECR_REPOSITORY_URL" | cut -d'/' -f1)

# Get ECR login token and login to Docker
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY_URL

echo "✅ Successfully logged into ECR"