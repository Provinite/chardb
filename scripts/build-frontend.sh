#!/bin/bash

# Frontend Build and Deploy Script
# This script builds the frontend with proper environment configuration

set -e

# Configuration
ENVIRONMENT=$1
BACKEND_URL=$2
VERSION=$3
# The host the site is served from. Communities are subdomains of it, and the
# bundle compares window.location.hostname against it to work out which
# community (if any) it is showing -- so it must be right, and it is required
# rather than defaulted: a wrong value shows the main site on every community.
ROOT_DOMAIN=$4

if [ -z "$ENVIRONMENT" ] || [ -z "$BACKEND_URL" ] || [ -z "$VERSION" ] || [ -z "$ROOT_DOMAIN" ]; then
    echo "❌ Environment, Backend URL, Version, and Root Domain are required"
    echo "Usage: $0 <environment> <backend_url> <version> <root_domain>"
    echo "Example: $0 prod https://api.chardb.example.com v1.0.0 chardb.example.com"
    exit 1
fi

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo "❌ Environment must be 'dev' or 'prod'"
    exit 1
fi

echo "🏗️  Building frontend for environment: $ENVIRONMENT"
echo "🔗 Backend URL: $BACKEND_URL"
echo "📋 Version: $VERSION"
echo "🌐 Root domain: $ROOT_DOMAIN"

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
echo "VITE_ROOT_DOMAIN=$ROOT_DOMAIN"
VITE_API_URL=$BACKEND_URL VITE_ENVIRONMENT=$ENVIRONMENT VITE_VERSION=$VERSION \
    VITE_ROOT_DOMAIN=$ROOT_DOMAIN yarn build

echo "✅ Frontend build completed!"
echo "📁 Build output available in: apps/frontend/dist"