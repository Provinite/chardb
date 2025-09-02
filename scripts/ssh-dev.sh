#!/bin/bash

# SSH into dev environment script
# Quick script to SSH into the development server

set -e

ENVIRONMENT="dev"

echo "🔌 Getting SSH connection details for $ENVIRONMENT..."

# Source the outputs
source <(./scripts/get-terraform-outputs.sh "$ENVIRONMENT" | grep "^export")

if [ -z "$SERVER_IP" ] || [ -z "$SSH_KEY_PATH" ]; then
    echo "❌ Missing required connection details"
    echo "SERVER_IP: $SERVER_IP"
    echo "SSH_KEY_PATH: $SSH_KEY_PATH" 
    exit 1
fi

echo "🚀 Connecting to $SERVER_IP..."
echo "💡 Tip: Once connected, you can check services with 'docker compose ps'"
echo ""

# SSH into the server (pass any additional arguments to ssh)
ssh -i "$SSH_KEY_PATH" "$@" ec2-user@$SERVER_IP