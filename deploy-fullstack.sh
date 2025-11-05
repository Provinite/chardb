#!/bin/bash

# CharDB Full-Stack Build and Deploy Script
# This script builds and deploys both backend and frontend

set -e

# Configuration
ENVIRONMENT=$1
IMAGE_TAG=${2:-latest}
DEPLOY_BACKEND=${3:-true}
DEPLOY_FRONTEND=${4:-true}

if [ -z "$ENVIRONMENT" ]; then
    echo "❌ Environment is required"
    echo "Usage: $0 <environment> [image_tag] [deploy_backend] [deploy_frontend]"
    echo ""
    echo "Examples:"
    echo "  $0 prod                    # Deploy both backend and frontend"
    echo "  $0 dev latest true false   # Backend only"
    echo "  $0 prod latest false true  # Frontend only" 
    exit 1
fi

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo "❌ Environment must be 'dev' or 'prod'"
    exit 1
fi

echo "🚀 Starting CharDB full-stack deployment"
echo "   Environment: $ENVIRONMENT"
echo "   Image tag: $IMAGE_TAG"
echo "   Deploy backend: $DEPLOY_BACKEND"
echo "   Deploy frontend: $DEPLOY_FRONTEND"
echo ""

# Deploy backend if requested
if [ "$DEPLOY_BACKEND" = "true" ]; then
    echo "🔨 Building and deploying backend..."
    
    # Build and push backend Docker image
    echo "📦 Building backend Docker image..."
    ./scripts/build-and-push.sh "$ENVIRONMENT" "$IMAGE_TAG"
    
    # Deploy backend to EC2
    echo "🚀 Deploying backend to EC2..."
    ./deploy.sh "$ENVIRONMENT" "$IMAGE_TAG"
    
    echo "✅ Backend deployment completed!"
else
    echo "⏭️  Skipping backend deployment"
fi

# Get backend URL for frontend
echo "📋 Getting backend URL for frontend..."
source <(./scripts/get-terraform-outputs.sh "$ENVIRONMENT" | grep "^export")

if [ -z "$BACKEND_URL" ]; then
    echo "❌ Could not get backend URL. Make sure backend infrastructure is deployed."
    exit 1
fi

echo "🔗 Backend URL: $BACKEND_URL"

# Deploy frontend if requested
if [ "$DEPLOY_FRONTEND" = "true" ]; then
    echo ""
    echo "🎨 Building and deploying frontend..."

    # Get frontend version from package.json
    FRONTEND_VERSION=$(node -p "require('./apps/frontend/package.json').version")
    echo "📋 Frontend version: $FRONTEND_VERSION"

    # Build frontend with backend URL and version
    echo "🏗️  Building frontend..."
    ./scripts/build-frontend.sh "$ENVIRONMENT" "$BACKEND_URL" "$FRONTEND_VERSION"

    # Deploy to S3
    echo "📤 Deploying frontend to S3..."
    ./scripts/deploy-frontend.sh "$ENVIRONMENT"

    echo "✅ Frontend deployment completed!"
else
    echo "⏭️  Skipping frontend deployment"
fi

echo ""
echo "🎉 Full-stack deployment completed successfully!"
echo ""

# Show final URLs
if [ "$DEPLOY_BACKEND" = "true" ]; then
    echo "🔗 Backend services:"
    echo "   - GraphQL API: $BACKEND_URL/graphql"
    echo "   - Jaeger tracing: http://$SERVER_IP:16686"
fi

if [ "$DEPLOY_FRONTEND" = "true" ]; then
    # Get frontend URL from terraform outputs
    cd infra/environments/$ENVIRONMENT
    FRONTEND_URL=$(terraform output -raw frontend_website_url 2>/dev/null || echo "Check CloudFront distribution in AWS console")
    cd ../../..
    echo "🌐 Frontend: $FRONTEND_URL"
fi

echo ""
echo "📝 Next steps:"
if [ "$DEPLOY_FRONTEND" = "true" ]; then
    echo "   - Frontend may take 5-15 minutes for CloudFront cache invalidation"
fi
echo "   - Monitor application health and logs"