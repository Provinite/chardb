#!/bin/sh
set -e

echo "🔄 Running database migrations..."

# Run migrations with yarn workspace
yarn workspace @chardb/database db:migrate:prod

echo "✅ Migrations completed successfully"

echo "🚀 Starting application..."
exec "$@"