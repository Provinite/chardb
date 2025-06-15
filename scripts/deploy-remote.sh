#!/bin/bash
set -e

# Remote deployment script - runs on the EC2 instance
# This script is copied and executed on the target server

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
echo "🌐 Backend API: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):4000"
echo "📊 Jaeger UI: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):16686"