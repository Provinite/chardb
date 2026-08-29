#!/bin/bash
#
# Deploy a released version to production.
#
#   ./scripts/deploy-prod-release.sh v10.2.0
#
# Registers a new ECS task definition revision carrying the released image and
# rolls the service onto it.
#
# The new revision is derived from the revision Terraform last created -- read
# from the ecs_task_definition_arn output -- not from the one currently running.
# That matters: the service ignores task_definition changes so deploys are not
# reverted by an apply, which also means a Terraform change to the definition
# does not deploy itself. Deriving from Terraform's revision is what lets those
# changes land on the next release instead of being stranded.

set -euo pipefail

VERSION="${1:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"
TF_DIR="infra/environments/prod"

if [ -z "$VERSION" ]; then
    echo "❌ Usage: $0 <version>   (e.g. v10.2.0)" >&2
    exit 1
fi

for tool in aws jq terraform; do
    command -v "$tool" >/dev/null || { echo "❌ $tool is required" >&2; exit 1; }
done

echo "🔎 Resolving deployment targets from Terraform..."
CLUSTER=$(terraform -chdir="$TF_DIR" output -raw ecs_cluster_name)
SERVICE=$(terraform -chdir="$TF_DIR" output -raw ecs_service_name)
BASE_TD=$(terraform -chdir="$TF_DIR" output -raw ecs_task_definition_arn)
ECR_URL=$(terraform -chdir="$TF_DIR" output -raw backend_ecr_repository_url)
IMAGE="${ECR_URL}:${VERSION}"

echo "   cluster:  $CLUSTER"
echo "   service:  $SERVICE"
echo "   base:     ${BASE_TD##*/}"
echo "   image:    ${IMAGE##*/}"

# Fail before touching the service if the image was never pushed. Otherwise ECS
# accepts the revision and the failure only appears when a task cannot pull.
echo "🔎 Verifying the image exists..."
aws ecr describe-images --region "$AWS_REGION" \
    --repository-name "${ECR_URL##*/}" \
    --image-ids "imageTag=${VERSION}" >/dev/null 2>&1 \
    || { echo "❌ ${IMAGE} not found in ECR -- was it built and pushed?" >&2; exit 1; }

WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT

echo "📦 Registering a task definition revision with the released image..."
aws ecs describe-task-definition --region "$AWS_REGION" \
    --task-definition "$BASE_TD" --query 'taskDefinition' > "$WORK/base.json"

# register-task-definition rejects the read-only fields describe returns.
jq --arg img "$IMAGE" '
    .containerDefinitions[0].image = $img
    | del(
        .taskDefinitionArn, .revision, .status, .requiresAttributes,
        .compatibilities, .registeredAt, .registeredBy, .deregisteredAt
      )
' "$WORK/base.json" > "$WORK/new.json"

NEW_TD=$(aws ecs register-task-definition --region "$AWS_REGION" \
    --cli-input-json "file://$WORK/new.json" \
    --query 'taskDefinition.taskDefinitionArn' --output text)
echo "   registered ${NEW_TD##*/}"

echo "🚀 Rolling the service onto it..."
aws ecs update-service --region "$AWS_REGION" \
    --cluster "$CLUSTER" --service "$SERVICE" \
    --task-definition "$NEW_TD" --no-cli-pager >/dev/null

echo "⏳ Waiting for the service to stabilise..."
aws ecs wait services-stable --region "$AWS_REGION" \
    --cluster "$CLUSTER" --services "$SERVICE"

echo "✅ ${VERSION} deployed as ${NEW_TD##*/}"
