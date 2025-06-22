#!/bin/bash

# Frontend Build and Deploy Script
# This script builds the frontend with proper environment configuration

set -e

# Configuration
ENVIRONMENT=$1
BACKEND_URL=$2
VERSION=$3

if [ -z "$ENVIRONMENT" ] || [ -z "$BACKEND_URL" ] || [ -z "$VERSION" ]; then
    echo "❌ Environment, Backend URL, and Version are required"
    echo "Usage: $0 <environment> <backend_url> <version>"
    echo "Example: $0 prod https://api.chardb.example.com v1.0.0"
    exit 1
fi

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo "❌ Environment must be 'dev' or 'prod'"
    exit 1
fi

echo "🏗️  Building frontend for environment: $ENVIRONMENT"
echo "🔗 Backend URL: $BACKEND_URL"
echo "📋 Version: $VERSION"

# Navigate to frontend directory
cd "$(dirname "$0")/../apps/frontend"

# Install dependencies
echo "📦 Installing dependencies..."
yarn install

# Build with environment variables (no shell pollution)
echo "🏗️  Building frontend with environment configuration..."
echo "VITE_API_URL=$BACKEND_URL"
echo "VITE_ENVIRONMENT=$ENVIRONMENT"
echo "VITE_VERSION=$VERSION"
VITE_API_URL=$BACKEND_URL VITE_ENVIRONMENT=$ENVIRONMENT VITE_VERSION=$VERSION yarn build

echo "✅ Frontend build completed!"
echo "📁 Build output available in: apps/frontend/dist"