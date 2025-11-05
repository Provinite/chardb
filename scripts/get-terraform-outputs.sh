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

# Get server IP (dev only - EC2)
SERVER_IP=$(terraform output -raw backend_public_ip 2>/dev/null || echo "")
if [ -z "$SERVER_IP" ] && [ "$ENVIRONMENT" = "dev" ]; then
    echo "❌ Could not get server IP from Terraform outputs (required for dev)"
    echo "Available outputs:"
    terraform output
    exit 1
fi

# Get SSH key content and save it (dev only)
SSH_KEY_CONTENT=$(terraform output -raw backend_ssh_private_key 2>/dev/null || echo "")
SSH_KEY_NAME=$(terraform output -raw backend_ssh_key_name 2>/dev/null || echo "")

if [ "$ENVIRONMENT" = "dev" ]; then
    if [ -z "$SSH_KEY_CONTENT" ]; then
        echo "❌ Could not get SSH key from Terraform outputs (required for dev)"
        exit 1
    fi

    # Create SSH key file
    SSH_KEY_PATH="$HOME/.ssh/${SSH_KEY_NAME}.pem"
    echo "$SSH_KEY_CONTENT" > "$SSH_KEY_PATH"
    chmod 600 "$SSH_KEY_PATH"
else
    SSH_KEY_PATH=""
fi

# Get ECR repository URL
ECR_REPOSITORY_URL=$(terraform output -raw backend_ecr_repository_url 2>/dev/null || echo "")

# Get database password and JWT secret
DB_PASSWORD=$(terraform output -raw backend_db_password 2>/dev/null || echo "")
JWT_SECRET=$(terraform output -raw backend_jwt_secret 2>/dev/null || echo "")

# Get DeviantArt OAuth credentials
DEVIANTART_CLIENT_ID=$(terraform output -raw backend_deviantart_client_id 2>/dev/null || echo "")
DEVIANTART_CLIENT_SECRET=$(terraform output -raw backend_deviantart_client_secret 2>/dev/null || echo "")
DEVIANTART_CALLBACK_URL=$(terraform output -raw backend_deviantart_callback_url 2>/dev/null || echo "")

# Get Discord OAuth credentials
DISCORD_CLIENT_ID=$(terraform output -raw backend_discord_client_id 2>/dev/null || echo "")
DISCORD_CLIENT_SECRET=$(terraform output -raw backend_discord_client_secret 2>/dev/null || echo "")
DISCORD_CALLBACK_URL=$(terraform output -raw backend_discord_callback_url 2>/dev/null || echo "")
DISCORD_BOT_TOKEN=$(terraform output -raw backend_discord_bot_token 2>/dev/null || echo "")

# Get backend URL for frontend
if [ "$ENVIRONMENT" = "prod" ]; then
    # Prod uses CloudFront API endpoint
    BACKEND_URL=$(terraform output -raw api_url 2>/dev/null || echo "")
    BACKEND_IP=""
else
    # Dev uses EC2 direct IP
    BACKEND_URL=$(terraform output -raw backend_url 2>/dev/null || echo "")
    BACKEND_IP=$(terraform output -raw backend_public_ip 2>/dev/null || echo "")
fi

# Get frontend URL from Terraform outputs
FRONTEND_URL=$(terraform output -raw frontend_website_url 2>/dev/null || echo "")

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
echo "export DATABASE_URL='postgresql://app:\$POSTGRES_PASSWORD@localhost:5432/app'"
echo "export FRONTEND_URL='$FRONTEND_URL'"