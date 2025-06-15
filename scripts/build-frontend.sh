#!/bin/bash

# Frontend Build and Deploy Script
# This script builds the frontend with proper environment configuration

set -e

# Configuration
ENVIRONMENT=$1
BACKEND_URL=$2

if [ -z "$ENVIRONMENT" ] || [ -z "$BACKEND_URL" ]; then
    echo "❌ Environment and Backend URL are required"
    echo "Usage: $0 <environment> <backend_url>"
    echo "Example: $0 prod https://api.chardb.example.com"
    exit 1
fi

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo "❌ Environment must be 'dev' or 'prod'"
    exit 1
fi

echo "🏗️  Building frontend for environment: $ENVIRONMENT"
echo "🔗 Backend URL: $BACKEND_URL"

# Navigate to frontend directory
cd "$(dirname "$0")/../apps/frontend"

# Create environment-specific .env file
echo "📝 Creating environment configuration..."
cat > .env << EOF
VITE_API_URL=$BACKEND_URL
VITE_ENVIRONMENT=$ENVIRONMENT
EOF

echo "✅ Environment file created:"
cat .env

# Install dependencies and build
echo "📦 Installing dependencies..."
yarn install

echo "🏗️  Building frontend..."
yarn build

echo "✅ Frontend build completed!"
echo "📁 Build output available in: apps/frontend/dist"