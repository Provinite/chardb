#!/bin/sh
set -e

echo "🔄 Running database migrations..."

# Run migrations directly with prisma
cd packages/database && npx prisma migrate deploy

echo "✅ Migrations completed successfully"

echo "🚀 Starting application..."
exec "$@"