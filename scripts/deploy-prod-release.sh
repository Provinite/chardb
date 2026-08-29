#!/bin/bash
#
# Deploy a released version to production.
#
#   ./scripts/deploy-prod-release.sh v10.2.0
#
# Registers a new ECS task definition revision carrying the released image and
# rolls the service onto it.
#
# The definition is built from the ecs_task_definition_input output, which
# Terraform computes from the environment, secrets, sizing, roles and logging it
# owns. Only the release identity comes from here: the image and the version
# label that must agree with it.
#
# Terraform holds no task definition in state, so it never registers a revision
# nothing deploys and never disagrees with the running one. It still owns the
# shape: a change there lands on the next release, because this reads the output
# rather than the running revision.

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
ECR_URL=$(terraform -chdir="$TF_DIR" output -raw backend_ecr_repository_url)
IMAGE="${ECR_URL}:${VERSION}"

echo "   cluster:  $CLUSTER"
echo "   service:  $SERVICE"
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
# Terraform's computed payload. Already in register-task-definition shape, so
# there are no read-only fields to strip -- unlike describe-task-definition
# output, which returns revision, status and friends that register rejects.
terraform -chdir="$TF_DIR" output -raw ecs_task_definition_input > "$WORK/base.json"

# OTEL_SERVICE_VERSION is the deploy's, not Terraform's.
#
# It has to agree with the deployed image, and Terraform only knows the version
# at apply time -- so any release cut after an apply would label the new build
# with the previous version. Nothing fails when that happens; telemetry just
# misattributes the build. Terraform omits the key entirely and this appends it,
# so the value has one author rather than two.
#
# The image is not omitted the same way, because it is a required field:
# Terraform has to emit something for its output to be a registrable definition,
# and that placeholder is overwritten here.
#
# The filter is defensive. If the key ever comes back on Terraform's side, this
# still produces exactly one, rather than two entries with ECS picking a winner.
jq --arg img "$IMAGE" --arg ver "${VERSION#v}" '
      .containerDefinitions[0].image = $img
    | .containerDefinitions[0].environment |=
        (map(select(.name != "OTEL_SERVICE_VERSION"))
          + [{name: "OTEL_SERVICE_VERSION", value: $ver}])
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
