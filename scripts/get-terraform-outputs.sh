#!/bin/bash

# Get Terraform Outputs Script
# Extracts infrastructure details from Terraform state
# Handles both dev (EC2) and prod (ECS) environments

set -e

ENVIRONMENT=${1:-prod}
TERRAFORM_DIR="infra/environments/$ENVIRONMENT"

if [ ! -d "$TERRAFORM_DIR" ]; then
    echo "❌ Terraform directory not found: $TERRAFORM_DIR"
    echo "Available environments:"
    ls -la infra/environments/
    exit 1
fi

echo "📋 Getting Terraform outputs for environment: $ENVIRONMENT"

cd "$TERRAFORM_DIR"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ jq is required but not installed. Please install jq to use this script."
    exit 1
fi

# Get all Terraform outputs in a single call
echo "🔍 Fetching Terraform outputs..."
TERRAFORM_OUTPUTS=$(terraform output -json 2>/dev/null)

if [ $? -ne 0 ] || [ -z "$TERRAFORM_OUTPUTS" ]; then
    echo "❌ Failed to get Terraform outputs"
    echo "Available outputs:"
    terraform output
    exit 1
fi

# Helper function to extract output value
get_output() {
    echo "$TERRAFORM_OUTPUTS" | jq -r ".$1.value // empty"
}

# Extract all outputs
SERVER_IP=$(get_output "backend_public_ip")
SSH_KEY_CONTENT=$(get_output "backend_ssh_private_key")
SSH_KEY_NAME=$(get_output "backend_ssh_key_name")
ECR_REPOSITORY_URL=$(get_output "backend_ecr_repository_url")
DB_PASSWORD=$(get_output "backend_db_password")
JWT_SECRET=$(get_output "backend_jwt_secret")
DEVIANTART_CLIENT_ID=$(get_output "backend_deviantart_client_id")
DEVIANTART_CLIENT_SECRET=$(get_output "backend_deviantart_client_secret")
DEVIANTART_CALLBACK_URL=$(get_output "backend_deviantart_callback_url")
DISCORD_CLIENT_ID=$(get_output "backend_discord_client_id")
DISCORD_CLIENT_SECRET=$(get_output "backend_discord_client_secret")
DISCORD_CALLBACK_URL=$(get_output "backend_discord_callback_url")
DISCORD_BOT_TOKEN=$(get_output "backend_discord_bot_token")
SQS_QUEUE_URL=$(get_output "backend_sqs_queue_url")
S3_IMAGES_BUCKET=$(get_output "images_bucket_name")
CLOUDFRONT_IMAGES_DOMAIN=$(get_output "images_cloudfront_domain")
FRONTEND_URL=$(get_output "frontend_website_url")

# Environment-specific validations and setup
if [ "$ENVIRONMENT" = "dev" ]; then
    # Dev environment validations
    if [ -z "$SERVER_IP" ]; then
        echo "❌ Could not get server IP from Terraform outputs (required for dev)"
        echo "Available outputs:"
        terraform output
        exit 1
    fi

    if [ -z "$SSH_KEY_CONTENT" ]; then
        echo "❌ Could not get SSH key from Terraform outputs (required for dev)"
        exit 1
    fi

    # Create SSH key file
    SSH_KEY_PATH="$HOME/.ssh/${SSH_KEY_NAME}.pem"
    echo "$SSH_KEY_CONTENT" > "$SSH_KEY_PATH"
    chmod 600 "$SSH_KEY_PATH"

    # Dev uses EC2 direct IP
    BACKEND_URL=$(get_output "backend_url")
else
    # Prod environment
    SSH_KEY_PATH=""
    # Prod uses CloudFront API endpoint
    BACKEND_URL=$(get_output "api_url")
fi

echo "✅ Terraform outputs retrieved:"
echo "   Server IP: $SERVER_IP"
echo "   Backend URL: $BACKEND_URL"
echo "   Frontend URL: $FRONTEND_URL"
echo "   SSH Key: $SSH_KEY_PATH"
echo "   ECR Repository: $ECR_REPOSITORY_URL"
echo "   Database Password: [REDACTED]"
echo "   JWT Secret: [REDACTED]"
echo "   DeviantArt Client ID: [REDACTED]"
echo "   DeviantArt Client Secret: [REDACTED]"
echo "   DeviantArt Callback URL: $DEVIANTART_CALLBACK_URL"
echo "   Discord Client ID: [REDACTED]"
echo "   Discord Client Secret: [REDACTED]"
echo "   Discord Callback URL: $DISCORD_CALLBACK_URL"
echo "   Discord Bot Token: [REDACTED]"
echo "   SQS Queue URL: $SQS_QUEUE_URL"
echo "   S3 Images Bucket: $S3_IMAGES_BUCKET"
echo "   CloudFront Images Domain: $CLOUDFRONT_IMAGES_DOMAIN"
echo ""
echo "Export these variables:"
echo "export SERVER_IP='$SERVER_IP'"
echo "export BACKEND_URL='$BACKEND_URL'"
echo "export SSH_KEY_PATH='$SSH_KEY_PATH'"
echo "export ECR_REPOSITORY_URL='$ECR_REPOSITORY_URL'"
echo "export POSTGRES_PASSWORD='$DB_PASSWORD'"
echo "export JWT_SECRET='$JWT_SECRET'"
echo "export DEVIANTART_CLIENT_ID='$DEVIANTART_CLIENT_ID'"
echo "export DEVIANTART_CLIENT_SECRET='$DEVIANTART_CLIENT_SECRET'"
echo "export DEVIANTART_CALLBACK_URL='$DEVIANTART_CALLBACK_URL'"
echo "export DISCORD_CLIENT_ID='$DISCORD_CLIENT_ID'"
echo "export DISCORD_CLIENT_SECRET='$DISCORD_CLIENT_SECRET'"
echo "export DISCORD_CALLBACK_URL='$DISCORD_CALLBACK_URL'"
echo "export DISCORD_BOT_TOKEN='$DISCORD_BOT_TOKEN'"
echo "export SQS_QUEUE_URL='$SQS_QUEUE_URL'"
echo "export S3_IMAGES_BUCKET='$S3_IMAGES_BUCKET'"
echo "export CLOUDFRONT_IMAGES_DOMAIN='$CLOUDFRONT_IMAGES_DOMAIN'"
echo "export DATABASE_URL='postgresql://app:\$POSTGRES_PASSWORD@localhost:5432/app'"
echo "export FRONTEND_URL='$FRONTEND_URL'"