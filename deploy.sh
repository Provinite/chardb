#!/bin/bash

# CharDB Deployment Script
# This script deploys the application to the EC2 instance after infrastructure is provisioned

set -e

# Configuration
ENVIRONMENT=${1:-prod}
IMAGE_TAG=${2:-latest}

# Get Terraform outputs
echo "📋 Getting Terraform outputs..."
if ! ./scripts/get-terraform-outputs.sh "$ENVIRONMENT" > /tmp/tf-outputs.log; then
    echo "❌ Failed to get Terraform outputs"
    cat /tmp/tf-outputs.log
    exit 1
fi

# Source the outputs
source <(./scripts/get-terraform-outputs.sh "$ENVIRONMENT" | grep "^export")

if [ -z "$SERVER_IP" ] || [ -z "$SSH_KEY_PATH" ] || [ -z "$ECR_REPOSITORY_URL" ]; then
    echo "❌ Missing required Terraform outputs"
    echo "SERVER_IP: $SERVER_IP"
    echo "SSH_KEY_PATH: $SSH_KEY_PATH" 
    echo "ECR_REPOSITORY_URL: $ECR_REPOSITORY_URL"
    exit 1
fi

echo "🚀 Deploying CharDB to $SERVER_IP (environment: $ENVIRONMENT)"

# Copy deployment files to server
echo "📦 Copying deployment files..."
scp -i "$SSH_KEY_PATH" docker/docker compose.prod.yml ec2-user@$SERVER_IP:~/app/docker compose.yml
scp -i "$SSH_KEY_PATH" docker/otel-collector-config.yml ec2-user@$SERVER_IP:~/app/otel-collector-config.yml
scp -i "$SSH_KEY_PATH" scripts/ecr-login.sh ec2-user@$SERVER_IP:~/app/ecr-login.sh

# Create deployment script on server
cat > deploy-remote.sh << EOF
#!/bin/bash
set -e

# Set environment variables
export ECR_REPOSITORY_URL="$ECR_REPOSITORY_URL"
export IMAGE_TAG="$IMAGE_TAG"
export AWS_REGION="\${AWS_REGION:-us-east-1}"
export AWS_ACCOUNT_ID="\$(aws sts get-caller-identity --query Account --output text)"

echo "🔐 Logging into ECR..."
chmod +x ecr-login.sh
./ecr-login.sh

echo "🛑 Stopping existing services..."
docker compose down || true

echo "📥 Pulling latest images..."
docker compose pull

echo "🚀 Starting services..."
docker compose up -d

echo "⏳ Waiting for services to be healthy..."
sleep 30

echo "🔍 Checking service status..."
docker compose ps

echo "✅ Deployment complete!"
echo "🌐 Backend API: http://\$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):4000"
echo "📊 Jaeger UI: http://\$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):16686"
EOF

# Copy and execute deployment script
echo "🚀 Executing deployment on server..."
scp -i "$SSH_KEY_PATH" deploy-remote.sh ec2-user@$SERVER_IP:~/app/deploy-remote.sh
ssh -i "$SSH_KEY_PATH" ec2-user@$SERVER_IP "cd ~/app && chmod +x deploy-remote.sh && ./deploy-remote.sh"

# Cleanup
rm deploy-remote.sh

echo "✅ Deployment completed successfully!"
echo "🌐 Your application should be available at:"
echo "   - Backend API: http://$SERVER_IP:4000"
echo "   - Jaeger UI: http://$SERVER_IP:16686"
echo ""
echo "📝 To SSH into the server:"
echo "   ssh -i $SSH_KEY_PATH ec2-user@$SERVER_IP"