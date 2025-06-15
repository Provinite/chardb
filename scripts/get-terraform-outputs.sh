#!/bin/bash

# Get Terraform Outputs Script
# Extracts server IP and SSH key from Terraform state

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

# Get server IP
SERVER_IP=$(terraform output -raw backend_public_ip 2>/dev/null || echo "")
if [ -z "$SERVER_IP" ]; then
    echo "❌ Could not get server IP from Terraform outputs"
    echo "Available outputs:"
    terraform output
    exit 1
fi

# Get SSH key content and save it
SSH_KEY_CONTENT=$(terraform output -raw backend_ssh_private_key 2>/dev/null || echo "")
SSH_KEY_NAME=$(terraform output -raw backend_ssh_key_name 2>/dev/null || echo "")

if [ -z "$SSH_KEY_CONTENT" ]; then
    echo "❌ Could not get SSH key from Terraform outputs"
    exit 1
fi

# Create SSH key file
SSH_KEY_PATH="$HOME/.ssh/${SSH_KEY_NAME}.pem"
echo "$SSH_KEY_CONTENT" > "$SSH_KEY_PATH"
chmod 600 "$SSH_KEY_PATH"

# Get ECR repository URL
ECR_REPOSITORY_URL=$(terraform output -raw backend_ecr_repository_url 2>/dev/null || echo "")

# Get database password and JWT secret
DB_PASSWORD=$(terraform output -raw backend_db_password 2>/dev/null || echo "")
JWT_SECRET=$(terraform output -raw backend_jwt_secret 2>/dev/null || echo "")

# Get backend URL for constructing DATABASE_URL
BACKEND_IP=$(terraform output -raw backend_public_ip 2>/dev/null || echo "")

echo "✅ Terraform outputs retrieved:"
echo "   Server IP: $SERVER_IP"
echo "   SSH Key: $SSH_KEY_PATH"
echo "   ECR Repository: $ECR_REPOSITORY_URL"
echo "   Database Password: [REDACTED]"
echo "   JWT Secret: [REDACTED]"
echo ""
echo "Export these variables:"
echo "export SERVER_IP='$SERVER_IP'"
echo "export SSH_KEY_PATH='$SSH_KEY_PATH'"
echo "export ECR_REPOSITORY_URL='$ECR_REPOSITORY_URL'"
echo "export POSTGRES_PASSWORD='$DB_PASSWORD'"
echo "export JWT_SECRET='$JWT_SECRET'"
echo "export DATABASE_URL='postgresql://app:\$POSTGRES_PASSWORD@localhost:5432/app'"
echo "export FRONTEND_URL='http://$BACKEND_IP:3000'"