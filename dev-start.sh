#!/bin/bash
set -euo pipefail

# Starts this worktree's development instance: its own containers on its own
# ports, plus the machine-wide shared tooling. Safe to run from several
# worktrees at once -- see docs/PARALLEL_INSTANCES.md.

cd "$(dirname "$0")"

echo "🚀 Starting CharDB Development Environment"
yarn instance

echo ""
echo "📊 Starting this instance's PostgreSQL and LocalStack..."
# --wait blocks on the healthchecks, so nothing below races a container that is
# not accepting connections yet.
yarn instance:up

echo "🔭 Starting shared tooling (Jaeger, MailHog, OTEL collector)..."
yarn shared:up

echo "🔄 Running database setup..."
yarn workspace @chardb/database db:generate
yarn workspace @chardb/database db:push

echo "🎯 Starting development servers..."
yarn dev
