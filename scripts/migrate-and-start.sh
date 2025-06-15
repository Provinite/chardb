#!/bin/bash
set -e

echo "🔄 Running database migrations..."

# Run migrations
yarn workspace @chardb/database db:migrate:prod

echo "✅ Migrations completed successfully"

echo "🚀 Starting application..."
exec "$@"