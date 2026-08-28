#!/usr/bin/env bash
set -euo pipefail

# Recover the dev/staging docker host.
#
# This used to call `aws ec2 reboot-instances`, which sends an ACPI shutdown
# request *to the guest*. A guest wedged by memory exhaustion cannot service
# that request, so the reboot silently did nothing while this script still
# reported success - the instance sat unreachable for weeks that way.
#
# Stop/start is performed by the hypervisor rather than the guest, and has the
# side benefit of relocating the instance onto healthy hardware. The Elastic IP
# stays associated across a stop/start, so the address does not change.

INSTANCE_NAME="chardb-backend-dev-docker-host"
FORCE_AFTER_SECONDS=120

echo "Looking up instance ID for '${INSTANCE_NAME}'..."
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=${INSTANCE_NAME}" "Name=instance-state-name,Values=running,stopped,stopping" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text)

if [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "None" ]]; then
  echo "Error: Could not find instance with Name tag '${INSTANCE_NAME}'"
  exit 1
fi

echo "Found instance: ${INSTANCE_ID}"

STATE=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
  --query "Reservations[0].Instances[0].State.Name" --output text)
echo "Current state: ${STATE}"

if [[ "$STATE" != "stopped" ]]; then
  echo "Stopping ${INSTANCE_ID}..."
  aws ec2 stop-instances --instance-ids "$INSTANCE_ID" >/dev/null

  # A wedged guest may not flush and halt on its own. Escalate to a forced stop
  # if it has not stopped within FORCE_AFTER_SECONDS.
  ELAPSED=0
  while [[ $ELAPSED -lt $FORCE_AFTER_SECONDS ]]; do
    STATE=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
      --query "Reservations[0].Instances[0].State.Name" --output text)
    [[ "$STATE" == "stopped" ]] && break
    sleep 10
    ELAPSED=$((ELAPSED + 10))
  done

  if [[ "$STATE" != "stopped" ]]; then
    echo "Still ${STATE} after ${FORCE_AFTER_SECONDS}s - forcing stop..."
    aws ec2 stop-instances --instance-ids "$INSTANCE_ID" --force >/dev/null
  fi

  echo "Waiting for stopped state..."
  aws ec2 wait instance-stopped --instance-ids "$INSTANCE_ID"
fi

echo "Starting ${INSTANCE_ID}..."
aws ec2 start-instances --instance-ids "$INSTANCE_ID" >/dev/null

echo "Waiting for running state..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"

echo "Waiting for status checks to pass (this can take a few minutes)..."
if aws ec2 wait instance-status-ok --instance-ids "$INSTANCE_ID"; then
  echo "Status checks passed."
else
  echo "WARNING: status checks did not pass. Inspect with:"
  echo "  aws ec2 get-console-output --instance-id ${INSTANCE_ID} --latest --output text"
  exit 1
fi

PUBLIC_IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
  --query "Reservations[0].Instances[0].PublicIpAddress" --output text)

echo "${INSTANCE_ID} (${INSTANCE_NAME}) is up at ${PUBLIC_IP}"
echo "Containers are restarted by docker's restart policy; verify with:"
echo "  ./scripts/ssh-dev.sh 'docker compose -f ~/app/compose.yaml ps && free -m'"
