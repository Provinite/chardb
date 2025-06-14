#!/bin/bash

echo "🚀 Starting CharDB Development Environment"

# Start database services in background
echo "📊 Starting PostgreSQL and Redis..."
docker compose -f docker/docker compose.yml up -d postgres redis

# Wait for services to be healthy
echo "⏳ Waiting for database to be ready..."
sleep 5

# Check if postgres is ready
until docker compose -f docker/docker compose.yml exec postgres pg_isready -U chardb -d chardb_dev > /dev/null 2>&1; do
  echo "⏳ Waiting for PostgreSQL..."
  sleep 2
done

echo "✅ Database is ready!"

# Run database migrations if needed
echo "🔄 Running database setup..."
cd apps/backend
yarn db:generate
yarn db:push
cd ../..

# Start development servers
echo "🎯 Starting development servers..."
yarn dev