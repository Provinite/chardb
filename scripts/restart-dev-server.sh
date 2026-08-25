#!/usr/bin/env bash
set -euo pipefail

INSTANCE_NAME="chardb-backend-dev-docker-host"

echo "Looking up instance ID for '${INSTANCE_NAME}'..."
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=${INSTANCE_NAME}" "Name=instance-state-name,Values=running,stopped" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text)

if [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "None" ]]; then
  echo "Error: Could not find instance with Name tag '${INSTANCE_NAME}'"
  exit 1
fi

echo "Found instance: ${INSTANCE_ID}"
echo "Rebooting..."
aws ec2 reboot-instances --instance-ids "$INSTANCE_ID"
echo "Reboot initiated for ${INSTANCE_ID} (${INSTANCE_NAME})"
