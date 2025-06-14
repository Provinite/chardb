#!/bin/bash

# ECR Login Script
# Logs into AWS ECR to pull Docker images

set -e

# Get AWS region (default to us-east-1)
AWS_REGION=${AWS_REGION:-us-east-1}

echo "🔐 Logging into ECR in region $AWS_REGION..."

# Get ECR login token and login to Docker
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

echo "✅ Successfully logged into ECR"