#!/bin/bash
#
# Terraform outputs -> environment variables.
#
# SOURCE this; do not execute it:
#
#   source ./scripts/get-terraform-outputs.sh dev
#   echo "$SERVER_IP"
#
# A script run as ./get-terraform-outputs.sh is a child process, and a child
# cannot alter its parent's environment -- which is why this used to print a
# block of `export FOO='bar'` lines for callers to eval back through
# `source <(... | grep "^export")`. That round trip put every secret in state,
# including the Discord bot token and the JWT secret, on stdout in plaintext.
# Harmless while every caller remembered the pipe, one forgotten pipe away from
# a public build log otherwise. Sourcing removes the round trip: the exports
# below land directly in the caller's shell and no secret is ever printed.
#
# Executing it anyway is still useful -- it prints a redacted summary of what is
# deployed -- so that path is kept, and just tells you how to source it.
#
# ---------------------------------------------------------------------------
# VARIABLES EXPORTED
#
# Every name below is exported into the calling shell. Nothing else is.
#
#   Connection and infrastructure
#     SERVER_IP                 Elastic IP of the docker host (dev only)
#     INSTANCE_ID               EC2 instance id; the SSM tunnel targets this
#     SSH_KEY_NAME              Key pair name; "" for prod
#     BACKEND_URL               API base URL (dev: EC2/CloudFront, prod: api_url)
#     FRONTEND_URL              Public website URL
#     ECR_REPOSITORY_URL        Backend image repository
#
#   Secrets -- exported, never printed
#     SSH_PRIVATE_KEY           Host SSH key, PEM contents; "" for prod
#     POSTGRES_PASSWORD         Database password
#     JWT_SECRET                Token signing secret
#     DEVIANTART_CLIENT_ID      DeviantArt OAuth client id
#     DEVIANTART_CLIENT_SECRET  DeviantArt OAuth client secret
#     DISCORD_CLIENT_ID         Discord OAuth client id
#     DISCORD_CLIENT_SECRET     Discord OAuth client secret
#     DISCORD_BOT_TOKEN         Discord bot token
#     TOYHOUSE_CLIENT_ID        ToyHouse OAuth client id
#     TOYHOUSE_CLIENT_SECRET    ToyHouse OAuth client secret
#
#   Non-secret application config
#     DEVIANTART_CALLBACK_URL   DeviantArt OAuth redirect URI
#     DISCORD_CALLBACK_URL      Discord OAuth redirect URI
#     TOYHOUSE_CALLBACK_URL     ToyHouse OAuth redirect URI
#     SQS_QUEUE_URL             Prize distribution queue
#     S3_IMAGES_BUCKET          Image storage bucket name
#     CLOUDFRONT_IMAGES_DOMAIN  Image CDN domain
#
# NOT EXPORTED (deliberately)
#     DATABASE_URL was previously emitted as
#     'postgresql://app:$POSTGRES_PASSWORD@localhost:5432/app' inside single
#     quotes, so the password never expanded and the value was a literal. It had
#     no consumers -- deploy.sh builds its own URL-encoded copy -- so rather than
#     carry a broken variable forward it is gone. A password generated with
#     special characters needs percent-encoding before it can go in a URL.
# ---------------------------------------------------------------------------

_tf_outputs_load() {
    local environment="${1:-prod}"
    local repo_root terraform_dir outputs_json

    # Resolve paths from this file rather than the caller's working directory.
    repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    terraform_dir="$repo_root/infra/environments/$environment"

    if [ ! -d "$terraform_dir" ]; then
        echo "❌ Terraform directory not found: $terraform_dir" >&2
        echo "   Available environments:" >&2
        ls -1 "$repo_root/infra/environments/" >&2
        return 1
    fi

    if ! command -v jq &> /dev/null; then
        echo "❌ jq is required but not installed." >&2
        return 1
    fi

    echo "📋 Reading Terraform outputs for environment: $environment" >&2

    # -chdir rather than cd: this function runs in the caller's shell, and a cd
    # here would strand them in infra/environments/<env>.
    if ! outputs_json=$(terraform -chdir="$terraform_dir" output -json 2>/dev/null) \
        || [ -z "$outputs_json" ]; then
        echo "❌ Failed to read Terraform outputs from $terraform_dir" >&2
        echo "   Run 'terraform -chdir=$terraform_dir init' if you have not already." >&2
        return 1
    fi

    _tf_output() { jq -r ".$1.value // empty" <<< "$outputs_json"; }

    # Kept in the same order as the VARIABLES EXPORTED block above.
    export SERVER_IP INSTANCE_ID SSH_KEY_NAME BACKEND_URL FRONTEND_URL \
        ECR_REPOSITORY_URL \
        SSH_PRIVATE_KEY POSTGRES_PASSWORD JWT_SECRET \
        DEVIANTART_CLIENT_ID DEVIANTART_CLIENT_SECRET \
        DISCORD_CLIENT_ID DISCORD_CLIENT_SECRET DISCORD_BOT_TOKEN \
        TOYHOUSE_CLIENT_ID TOYHOUSE_CLIENT_SECRET \
        DEVIANTART_CALLBACK_URL DISCORD_CALLBACK_URL TOYHOUSE_CALLBACK_URL \
        SQS_QUEUE_URL S3_IMAGES_BUCKET CLOUDFRONT_IMAGES_DOMAIN

    SERVER_IP=$(_tf_output "backend_public_ip")
    INSTANCE_ID=$(_tf_output "backend_instance_id")
    FRONTEND_URL=$(_tf_output "frontend_website_url")
    ECR_REPOSITORY_URL=$(_tf_output "backend_ecr_repository_url")

    POSTGRES_PASSWORD=$(_tf_output "backend_db_password")
    JWT_SECRET=$(_tf_output "backend_jwt_secret")
    DEVIANTART_CLIENT_ID=$(_tf_output "backend_deviantart_client_id")
    DEVIANTART_CLIENT_SECRET=$(_tf_output "backend_deviantart_client_secret")
    DISCORD_CLIENT_ID=$(_tf_output "backend_discord_client_id")
    DISCORD_CLIENT_SECRET=$(_tf_output "backend_discord_client_secret")
    DISCORD_BOT_TOKEN=$(_tf_output "backend_discord_bot_token")
    TOYHOUSE_CLIENT_ID=$(_tf_output "backend_toyhouse_client_id")
    TOYHOUSE_CLIENT_SECRET=$(_tf_output "backend_toyhouse_client_secret")

    DEVIANTART_CALLBACK_URL=$(_tf_output "backend_deviantart_callback_url")
    DISCORD_CALLBACK_URL=$(_tf_output "backend_discord_callback_url")
    TOYHOUSE_CALLBACK_URL=$(_tf_output "backend_toyhouse_callback_url")
    SQS_QUEUE_URL=$(_tf_output "backend_sqs_queue_url")
    S3_IMAGES_BUCKET=$(_tf_output "images_bucket_name")
    CLOUDFRONT_IMAGES_DOMAIN=$(_tf_output "images_cloudfront_domain")

    if [ "$environment" = "dev" ]; then
        if [ -z "$SERVER_IP" ]; then
            echo "❌ backend_public_ip is empty (required for dev)" >&2
            unset -f _tf_output
            return 1
        fi

        SSH_PRIVATE_KEY=$(_tf_output "backend_ssh_private_key")
        SSH_KEY_NAME=$(_tf_output "backend_ssh_key_name")

        if [ -z "$SSH_PRIVATE_KEY" ]; then
            echo "❌ backend_ssh_private_key is empty (required for dev)" >&2
            unset -f _tf_output
            return 1
        fi

        BACKEND_URL=$(_tf_output "backend_url")
    else
        SSH_PRIVATE_KEY=""
        SSH_KEY_NAME=""
        BACKEND_URL=$(_tf_output "api_url")
    fi

    unset -f _tf_output
    return 0
}

_tf_outputs_summary() {
    cat >&2 <<SUMMARY
✅ Terraform outputs loaded:
   Environment:         ${1:-prod}
   Server IP:           $SERVER_IP
   Instance ID:         $INSTANCE_ID
   Backend URL:         $BACKEND_URL
   Frontend URL:        $FRONTEND_URL
   SSH key pair:        ${SSH_KEY_NAME:-(none)}
   ECR repository:      $ECR_REPOSITORY_URL
   SQS queue:           $SQS_QUEUE_URL
   Images bucket:       $S3_IMAGES_BUCKET
   Images CDN:          $CLOUDFRONT_IMAGES_DOMAIN
   DeviantArt callback: $DEVIANTART_CALLBACK_URL
   Discord callback:    $DISCORD_CALLBACK_URL
   ToyHouse callback:   $TOYHOUSE_CALLBACK_URL

   Secrets (database password, JWT secret, OAuth client secrets, bot token)
   are exported but deliberately not printed.
SUMMARY
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    # Executed rather than sourced. The exports die with this shell, so all we
    # can usefully do is report what is deployed and say how to load it.
    _tf_outputs_load "$@" || exit 1
    _tf_outputs_summary "${1:-prod}"
    cat >&2 <<HINT

ℹ️  Run as a script, these variables live only in this shell. To load them into
   your own shell, source it instead:

       source ${BASH_SOURCE[0]} ${1:-prod}
HINT
    exit 0
fi

_tf_outputs_load "$@" || return 1
_tf_outputs_summary "${1:-prod}"
