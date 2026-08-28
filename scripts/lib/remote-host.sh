#!/bin/bash
#
# Shared SSH transport for the dev/staging docker host.
#
# Sourced, not executed. Defines REMOTE_TARGET and the SSH_OPTS array, which
# `ssh` and `scp` both accept:
#
#   source scripts/lib/remote-host.sh
#   setup_remote_transport
#   scp "${SSH_OPTS[@]}" file "$REMOTE_TARGET:~/app/"
#   ssh "${SSH_OPTS[@]}" "$REMOTE_TARGET" 'uptime'
#
# The default transport tunnels SSH through Session Manager, addressing the host
# by instance id rather than IP. Nothing listens on port 22 from the internet's
# point of view: the tunnel emerges on the instance's own loopback, so GitHub
# Actions can deploy without the security group ever naming a runner IP.
#
# Set DEPLOY_TRANSPORT=direct to connect straight to the Elastic IP instead.
# That path still works from an address in backend_ssh_allowed_cidr_blocks and
# is the break-glass route if the SSM agent is unhealthy.

setup_remote_transport() {
    local transport="${DEPLOY_TRANSPORT:-ssm}"

    if [ -z "$SSH_KEY_PATH" ]; then
        echo "❌ SSH_KEY_PATH is not set (source scripts/get-terraform-outputs.sh first)" >&2
        return 1
    fi

    SSH_OPTS=(
        -i "$SSH_KEY_PATH"
        # accept-new rather than no: a first connection is recorded silently,
        # but a host key that *changes* still fails loudly.
        -o StrictHostKeyChecking=accept-new
        -o ConnectTimeout=30
    )

    case "$transport" in
        ssm)
            if [ -z "$INSTANCE_ID" ]; then
                echo "❌ INSTANCE_ID is not set (needed for the Session Manager tunnel)" >&2
                return 1
            fi

            if ! command -v session-manager-plugin &> /dev/null; then
                echo "❌ session-manager-plugin is not installed." >&2
                echo "   It is what turns 'aws ssm start-session' into a usable tunnel." >&2
                echo "   Install: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html" >&2
                echo "   Or set DEPLOY_TRANSPORT=direct to connect over the public IP instead." >&2
                return 1
            fi

            # %h is the instance id and %p the port ssh wants; sh -c keeps the
            # quoting around --parameters intact.
            SSH_OPTS+=(
                -o "ProxyCommand=sh -c \"aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p' --region ${AWS_REGION:-us-east-1}\""
            )
            REMOTE_TARGET="ec2-user@${INSTANCE_ID}"
            echo "🔒 Transport: SSH over Session Manager (${INSTANCE_ID})" >&2
            ;;
        direct)
            if [ -z "$SERVER_IP" ]; then
                echo "❌ SERVER_IP is not set (needed for a direct connection)" >&2
                return 1
            fi
            REMOTE_TARGET="ec2-user@${SERVER_IP}"
            echo "🔓 Transport: direct SSH to ${SERVER_IP}" >&2
            ;;
        *)
            echo "❌ Unknown DEPLOY_TRANSPORT '$transport' (expected 'ssm' or 'direct')" >&2
            return 1
            ;;
    esac
}
