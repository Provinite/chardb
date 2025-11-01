#!/bin/bash

# CharDB Deployment Script
# This script deploys the application to the EC2 instance after infrastructure is provisioned

set -e

# Configuration
ENVIRONMENT=$1
IMAGE_TAG=${2:-latest}

if [ -z "$ENVIRONMENT" ]; then
    echo "❌ Environment is required"
    echo "Usage: $0 <environment> [image_tag]"
    echo "Example: $0 prod latest"
    exit 1
fi

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo "❌ Environment must be 'dev' or 'prod'"
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

# Get variables from terraform outputs
source <(./scripts/get-terraform-outputs.sh "$ENVIRONMENT" | grep "^export")

# URL-encode the password for DATABASE_URL
ENCODED_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$POSTGRES_PASSWORD', safe=''))")

# Create comprehensive .env file for Docker Compose
echo "📦 Creating comprehensive .env file..."
cat > .tmp/.env << EOF
# ECR and deployment settings
ECR_REPOSITORY_URL=$ECR_REPOSITORY_URL
IMAGE_TAG=$IMAGE_TAG
AWS_REGION=us-east-1

# Database settings
POSTGRES_DB=app
POSTGRES_USER=app
POSTGRES_PASSWORD="${POSTGRES_PASSWORD//$/\\$}"
POSTGRES_PORT=5432
DATABASE_URL="postgresql://app:$ENCODED_PASSWORD@postgres:5432/app"

# Application settings
JWT_SECRET="${JWT_SECRET//$/\\$}"
NODE_ENV=production
FRONTEND_URL="$FRONTEND_URL"

# DeviantArt OAuth
DEVIANTART_CLIENT_ID="${DEVIANTART_CLIENT_ID//$/\\$}"
DEVIANTART_CLIENT_SECRET="${DEVIANTART_CLIENT_SECRET//$/\\$}"
DEVIANTART_CALLBACK_URL="$DEVIANTART_CALLBACK_URL"

# Discord OAuth
DISCORD_CLIENT_ID="${DISCORD_CLIENT_ID//$/\\$}"
DISCORD_CLIENT_SECRET="${DISCORD_CLIENT_SECRET//$/\\$}"
DISCORD_CALLBACK_URL="$DISCORD_CALLBACK_URL"

# OpenTelemetry settings
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4320/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://otel-collector:4320/v1/metrics

# GraphQL settings
GRAPHQL_PLAYGROUND=true
GRAPHQL_INTROSPECTION=true
GRAPHQL_CSRF_PREVENTION=false

# Port configurations
BACKEND_PORT=4000
JAEGER_UI_PORT=16686
OTEL_GRPC_PORT=4319
OTEL_HTTP_PORT=4320
OTEL_METRICS_PORT=8889
EOF

# Create simple deploy script that relies on .env file
echo "📦 Creating deployment script..."
cat > .tmp/deploy-remote.sh << 'EOF'
#!/bin/bash
set -e

echo "🔐 Logging into ECR..."
chmod +x ecr-login.sh

# Source .env file for ECR login script
if [ -f .env ]; then
    set -a  # automatically export all variables
    source .env
    set +a
    echo "✅ Loaded environment variables from .env"
    echo "ECR URL: $ECR_REPOSITORY_URL"
else
    echo "❌ .env file not found"
    exit 1
fi

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

# Copy deployment files to server
echo "📦 Copying deployment files..."
scp -i "$SSH_KEY_PATH" docker/docker-compose.prod.yml ec2-user@$SERVER_IP:~/app/compose.yaml
echo "1/7"
scp -i "$SSH_KEY_PATH" docker/docker-compose.overrides.prod.yml ec2-user@$SERVER_IP:~/app/compose.override.yaml
echo "2/7"
scp -i "$SSH_KEY_PATH" -r docker/services/ ec2-user@$SERVER_IP:~/app/
echo "3/7"
scp -i "$SSH_KEY_PATH" docker/otel-collector-config.yml ec2-user@$SERVER_IP:~/app/services/otel-collector-config.yml
echo "4/7"
scp -i "$SSH_KEY_PATH" scripts/ecr-login.sh ec2-user@$SERVER_IP:~/app/ecr-login.sh
echo "5/7"
scp -i "$SSH_KEY_PATH" .tmp/.env ec2-user@$SERVER_IP:~/app/.env
echo "6/7"
scp -i "$SSH_KEY_PATH" .tmp/deploy-remote.sh ec2-user@$SERVER_IP:~/app/deploy-remote.sh
echo "7/7"

# Execute deployment script
echo "🚀 Executing deployment on server..."
ssh -i "$SSH_KEY_PATH" ec2-user@$SERVER_IP "cd ~/app && chmod +x deploy-remote.sh && ./deploy-remote.sh"

echo "✅ Deployment completed successfully!"
echo "🌐 Your application should be available at:"
echo "   - Backend API: http://$SERVER_IP:4000"
echo "   - Jaeger UI: http://$SERVER_IP:16686"
echo ""
echo "📝 To SSH into the server:"
echo "   ssh -i $SSH_KEY_PATH ec2-user@$SERVER_IP"