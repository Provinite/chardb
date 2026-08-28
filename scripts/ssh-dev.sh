#!/bin/bash

# SSH into dev environment script
# Quick script to SSH into the development server

set -e

ENVIRONMENT="dev"

echo "🔌 Getting SSH connection details for $ENVIRONMENT..."

# Source the outputs
source ./scripts/get-terraform-outputs.sh "$ENVIRONMENT"

if [ -z "$SERVER_IP" ] || [ -z "$SSH_PRIVATE_KEY" ]; then
    echo "❌ Missing required connection details"
    echo "SERVER_IP: $SERVER_IP"
    echo "SSH_PRIVATE_KEY: ${SSH_PRIVATE_KEY:+[present]}"
    exit 1
fi

# Same transport the deploy uses: SSH tunnelled over Session Manager by default,
# so this works from any machine with AWS credentials rather than only from an
# address listed in backend_ssh_allowed_cidr_blocks. See
# scripts/lib/remote-host.sh for the DEPLOY_TRANSPORT=direct fallback.
source "$(dirname "$0")/lib/remote-host.sh"
setup_remote_transport

echo "🚀 Connecting to $REMOTE_TARGET..."
echo "💡 Tip: Once connected, you can check services with 'docker compose ps'"
echo ""

# SSH into the server (pass any additional arguments to ssh)
ssh "${SSH_OPTS[@]}" "$REMOTE_TARGET" "$@"