#!/bin/bash

# CharDB Deployment Script
# Deploys the backend to the target environment
# - dev: EC2 instance with Docker Compose
# - prod: ECS Fargate

set -e

# Configuration
ENVIRONMENT=$1
IMAGE_TAG=${2:-latest}
AWS_REGION=${AWS_REGION:-us-east-1}

if [ -z "$ENVIRONMENT" ]; then
    echo "❌ Environment is required"
    echo "Usage: $0 <environment> [image_tag]"
    echo "Example: $0 prod latest"
    exit 1
fi

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo "❌ Environment must be 'dev' or 'prod'"
    exit 1
fi

##############################################################################
# Production Deployment (ECS Fargate)
##############################################################################
if [ "$ENVIRONMENT" = "prod" ]; then
    echo "🚀 Deploying backend to ECS Fargate (environment: $ENVIRONMENT, tag: $IMAGE_TAG)"

    echo "📋 Getting ECS infrastructure details from Terraform..."
    cd "infra/environments/prod"

    if ! CLUSTER_NAME=$(terraform output -raw ecs_cluster_name 2>/dev/null); then
        echo "❌ Failed to get ECS cluster name from Terraform"
        echo "Make sure you've run 'terraform apply' first"
        exit 1
    fi

    if ! SERVICE_NAME=$(terraform output -raw ecs_service_name 2>/dev/null); then
        echo "❌ Failed to get ECS service name from Terraform"
        exit 1
    fi

    cd ../../..

    echo "📦 ECS Configuration:"
    echo "   Cluster: $CLUSTER_NAME"
    echo "   Service: $SERVICE_NAME"
    echo "   Image Tag: $IMAGE_TAG"

    # Update ECS service to trigger deployment
    echo ""
    echo "🔄 Triggering ECS service update..."
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$SERVICE_NAME" \
        --force-new-deployment \
        --region "$AWS_REGION" \
        --no-cli-pager \
        > /dev/null

    echo "✅ ECS deployment triggered successfully!"
    echo ""
    echo "📊 Monitor deployment:"
    echo "   aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION"
    echo ""
    echo "📋 View logs:"
    echo "   aws logs tail /ecs/chardb-prod --follow --region $AWS_REGION"
    echo ""
    echo "⏳ ECS is deploying new tasks with migrations (takes ~2-3 minutes)"

    exit 0
fi

##############################################################################
# Dev Deployment (EC2 with Docker Compose)
##############################################################################
# Load TF outputs into env
source ./scripts/get-terraform-outputs.sh "$ENVIRONMENT"

if [ -z "$SERVER_IP" ] || [ -z "$SSH_PRIVATE_KEY" ] || [ -z "$ECR_REPOSITORY_URL" ]; then
    echo "❌ Missing required Terraform outputs"
    echo "SERVER_IP: $SERVER_IP"
    echo "SSH_PRIVATE_KEY: ${SSH_PRIVATE_KEY:+[present]}"
    echo "ECR_REPOSITORY_URL: $ECR_REPOSITORY_URL"
    exit 1
fi

echo "🚀 Deploying CharDB to $SERVER_IP (environment: $ENVIRONMENT)"

# Resolve how to reach the host. Defaults to tunnelling SSH over Session
# Manager, which is what lets GitHub Actions deploy without the security group
# naming a runner IP. See scripts/lib/remote-host.sh.
source ./scripts/lib/remote-host.sh
setup_remote_transport

mkdir -p .tmp

# URL-encode the password for DATABASE_URL
ENCODED_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$POSTGRES_PASSWORD', safe=''))")

# Create comprehensive .env file for Docker Compose
echo "📦 Creating comprehensive .env file..."
cat > .tmp/.env << EOF
# ECR and deployment settings
ECR_REPOSITORY_URL=$ECR_REPOSITORY_URL
IMAGE_TAG=$IMAGE_TAG
AWS_REGION=us-east-1

# Database settings
POSTGRES_DB=app
POSTGRES_USER=app
POSTGRES_PASSWORD="${POSTGRES_PASSWORD//$/\\$}"
POSTGRES_PORT=5432
DATABASE_URL="postgresql://app:$ENCODED_PASSWORD@postgres:5432/app"

# Application settings
JWT_SECRET="${JWT_SECRET//$/\\$}"
NODE_ENV=production
FRONTEND_URL="$FRONTEND_URL"
EMAIL_FROM="noreply@dev.chardb.cc"

# OAuth client ids and callback URLs. Neither is secret. The client secrets and
# bot token are NOT written here -- the host fetches those from Parameter Store
# under the path below, using its instance role, so they never pass through this
# machine or a CI runner.
DEVIANTART_CLIENT_ID="$DEVIANTART_CLIENT_ID"
DISCORD_CLIENT_ID="$DISCORD_CLIENT_ID"
TOYHOUSE_CLIENT_ID="$TOYHOUSE_CLIENT_ID"
DEVIANTART_CALLBACK_URL="$DEVIANTART_CALLBACK_URL"
DISCORD_CALLBACK_URL="$DISCORD_CALLBACK_URL"
TOYHOUSE_CALLBACK_URL="$TOYHOUSE_CALLBACK_URL"
SSM_PARAMETER_PATH="/chardb/$ENVIRONMENT"

# AWS SQS Configuration
AWS_SQS_ENABLED="true"
AWS_SQS_QUEUE_URL="$SQS_QUEUE_URL"

# AWS S3 Image Storage Configuration
S3_IMAGES_BUCKET="$S3_IMAGES_BUCKET"
CLOUDFRONT_IMAGES_DOMAIN="$CLOUDFRONT_IMAGES_DOMAIN"

# OpenTelemetry settings
# Tracing is disabled on this host: Jaeger and the OTEL collector are no longer
# deployed here (see docker/docker-compose.prod.yml). Must be the literal
# string "true" - @opentelemetry/core only accepts "true"/"false", not "1".
OTEL_SDK_DISABLED=true

# GraphQL settings
GRAPHQL_PLAYGROUND=true
GRAPHQL_INTROSPECTION=true
GRAPHQL_CSRF_PREVENTION=false

# Port configurations
BACKEND_PORT=4000
EOF

# Create simple deploy script that relies on .env file
echo "📦 Creating deployment script..."
cat > .tmp/deploy-remote.sh << 'EOF'
#!/bin/bash
set -e

echo "🔐 Logging into ECR..."
chmod +x ecr-login.sh

# Source .env file for ECR login script
if [ -f .env ]; then
    set -a  # automatically export all variables
    source .env
    set +a
    echo "✅ Loaded environment variables from .env"
    echo "ECR URL: $ECR_REPOSITORY_URL"
else
    echo "❌ .env file not found"
    exit 1
fi

./ecr-login.sh

# Load application secrets from Parameter Store.
#
# Fetched here, on the host, using its instance role. Nothing upstream carries
# them: deploy.sh does not write them into .env, and get-terraform-outputs.sh
# does not export them, so they never enter a developer or CI shell.
#
# They are written into .env, not just exported, so that `docker compose up -d`
# run by hand on the box still works. Without them in the file compose resolves
# ${DISCORD_BOT_TOKEN} to an empty string with only a warning, silently
# recreating the backend with blank OAuth config -- exactly when someone is
# already recovering the host.
#
# Discovered by path rather than from a hardcoded list, so adding a parameter
# needs no change here.
echo "🔑 Fetching application secrets from ${SSM_PARAMETER_PATH}..."

if [ -z "$SSM_PARAMETER_PATH" ]; then
    echo "❌ SSM_PARAMETER_PATH is not set in .env"
    exit 1
fi

SECRETS_JSON=$(aws ssm get-parameters-by-path \
    --path "$SSM_PARAMETER_PATH" \
    --recursive --with-decryption \
    --region "$AWS_REGION" \
    --output json) || {
    echo "❌ Could not read $SSM_PARAMETER_PATH -- check the instance role"
    exit 1
}

SECRET_COUNT=$(echo "$SECRETS_JSON" | jq '.Parameters | length')
if [ "$SECRET_COUNT" -eq 0 ]; then
    echo "❌ No parameters found under $SSM_PARAMETER_PATH"
    exit 1
fi

# A parameter still holding the Terraform placeholder means someone created the
# infrastructure but never set the real value. Fail rather than boot an app
# that will reject every OAuth callback.
PLACEHOLDERS=$(echo "$SECRETS_JSON" \
    | jq -r '.Parameters[] | select(.Value == "not-managed-by-terraform") | .Name')
if [ -n "$PLACEHOLDERS" ]; then
    echo "❌ These parameters still hold the placeholder value:"
    echo "$PLACEHOLDERS" | sed 's/^/     /'
    echo "   Set them with: aws ssm put-parameter --overwrite --type SecureString --name <name> --value ..."
    exit 1
fi

# jq hands the value over base64-encoded so it survives the pipe intact whatever
# bytes it contains; the escaping below is what compose's env-file parser needs
# to read it back byte-exact. Order matters: backslash first, or the escapes
# introduced by the later substitutions get escaped again.
#
#   \  ->  \\     "  ->  \"     $  ->  $$   (compose's literal-dollar escape)
#
# Single quotes need no escaping inside double quotes -- but they are why the
# value cannot simply be single-quoted: compose rejects the whole file.
{
    echo ""
    echo "# Fetched from Parameter Store at deploy time by deploy-remote.sh"
} >> .env

while read -r key encoded; do
    [ -n "$key" ] || continue
    value=$(printf '%s' "$encoded" | base64 -d)
    escaped=${value//\\/\\\\}
    escaped=${escaped//\"/\\\"}
    escaped=${escaped//\$/\$\$}
    printf '%s="%s"\n' "$key" "$escaped" >> .env
done < <(echo "$SECRETS_JSON" | jq -r '
    .Parameters[]
    | (.Name | split("/") | last | ascii_upcase | gsub("-"; "_")) as $key
    | "\($key) \(.Value | @base64)"
')
unset value escaped

echo "✅ Loaded $SECRET_COUNT secrets from Parameter Store into .env"

echo "🛑 Stopping existing services..."
# --remove-orphans: `docker compose down` only stops services the *current*
# compose files define. A service removed from the config leaves its container
# running, invisible to compose and still consuming memory -- which is what
# happened when jaeger and otel-collector were retired.
docker compose down --remove-orphans || true

echo "📥 Pulling latest images..."
docker compose pull

echo "🚀 Starting services..."
docker compose up -d

echo "⏳ Waiting for services to be healthy..."
sleep 30

echo "🔍 Checking service status..."
docker compose ps

echo "🧹 Removing images no longer in use..."
# Without this the host keeps one image per deploy and drops none. Main takes
# something like ten merges on a busy day at ~850MB each, so a 50GB disk has
# about a week in it. It ran out on 2026-08-31, and the failure is not a
# gentle one: `docker compose down` has already run by the time the pull hits
# the full disk, so the site is left down rather than merely un-updated.
#
# After `up -d`, so the images the running containers use are protected by
# being referenced. `-a` rather than the default because these are not
# dangling images -- each old deploy is a real tag, and only the running one
# is spoken for.
#
# Nothing is held back for rollback, because nothing needs to be. Every tag is
# in ECR; rolling back is a deploy at an older tag, which pulls it again.
#
# `|| true` so that tidying up cannot fail a deployment that already worked.
docker image prune -af || true

# Cheap, and it is the number that would have named this problem on the
# deploy that first got close rather than the one that fell over.
df -h / | awk 'NR==2 {print "💾 Disk: " $3 " used of " $2 " (" $5 "), " $4 " free"}'

echo "✅ Deployment complete!"
# IMDSv2: the instance sets http_tokens = "required", so an unauthenticated
# IMDS read returns 401.
IMDS_TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" \
  http://169.254.169.254/latest/meta-data/public-ipv4)
echo "🌐 Backend API: http://$PUBLIC_IP:4000"
EOF

# Copy deployment files to server
echo "📦 Copying deployment files..."
# ~/app is created by user_data on a fresh instance, but a tunnelled scp fails
# unhelpfully if it is missing, so make sure of it first.
ssh "${SSH_OPTS[@]}" "$REMOTE_TARGET" 'mkdir -p ~/app'

scp "${SSH_OPTS[@]}" docker/docker-compose.prod.yml "$REMOTE_TARGET:~/app/compose.yaml"
echo "1/6"
scp "${SSH_OPTS[@]}" docker/docker-compose.overrides.prod.yml "$REMOTE_TARGET:~/app/compose.override.yaml"
echo "2/6"
scp "${SSH_OPTS[@]}" -r docker/services/ "$REMOTE_TARGET:~/app/"
echo "3/6"
scp "${SSH_OPTS[@]}" scripts/ecr-login.sh "$REMOTE_TARGET:~/app/ecr-login.sh"
echo "4/6"
scp "${SSH_OPTS[@]}" .tmp/.env "$REMOTE_TARGET:~/app/.env"
echo "5/6"
scp "${SSH_OPTS[@]}" .tmp/deploy-remote.sh "$REMOTE_TARGET:~/app/deploy-remote.sh"
echo "6/6"

# Execute deployment script
echo "🚀 Executing deployment on server..."
ssh "${SSH_OPTS[@]}" "$REMOTE_TARGET" "cd ~/app && chmod +x deploy-remote.sh && ./deploy-remote.sh"

echo "✅ Deployment completed successfully!"
echo "🌐 Your application should be available at:"
echo "   - Backend API: http://$SERVER_IP:4000"
echo ""
echo "📝 To SSH into the server:"
echo "   ./scripts/ssh-dev.sh"