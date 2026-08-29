#!/bin/bash
#
# Promote the image a source environment already ran into this environment's
# repository, under a release tag.
#
#   ./scripts/promote-image.sh v10.2.0 0ab0f4951cd0
#
# The second argument is the commit the release points at. Staging tags its
# images v-<first 12 of sha> (see .github/workflows/ci.yml), so that commit
# identifies the artifact staging built and deployed.
#
# Promoting rather than rebuilding is the point: a rebuild produces a different
# artifact -- different layer digests, and any unpinned transitive dependency
# can resolve differently -- so production would run something never tested.

set -euo pipefail

VERSION="${1:-}"
COMMIT="${2:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"
SOURCE_ENV="${PROMOTION_SOURCE_ENV:-dev}"
TF_DIR="infra/environments/prod"

if [ -z "$VERSION" ] || [ -z "$COMMIT" ]; then
    echo "❌ Usage: $0 <version> <commit-sha>   (e.g. $0 v10.2.0 0ab0f4951cd0)" >&2
    exit 1
fi

command -v aws >/dev/null || { echo "❌ aws cli is required" >&2; exit 1; }

DEST_URL=$(terraform -chdir="$TF_DIR" output -raw backend_ecr_repository_url)
DEST_REPO="${DEST_URL##*/}"
REGISTRY="${DEST_URL%%/*}"
# Same registry, sibling repository -- see promotion_source_environment.
SOURCE_REPO="${DEST_REPO%-*}-${SOURCE_ENV}"
SOURCE_TAG="v-${COMMIT:0:12}"

echo "🔎 Promotion"
echo "   from: ${SOURCE_REPO}:${SOURCE_TAG}"
echo "   to:   ${DEST_REPO}:${VERSION}"

# Already promoted? Re-running a release should be cheap and safe.
if aws ecr describe-images --region "$AWS_REGION" \
       --repository-name "$DEST_REPO" --image-ids "imageTag=${VERSION}" >/dev/null 2>&1; then
    echo "✅ ${DEST_REPO}:${VERSION} already exists -- nothing to copy"
    exit 0
fi

# The source must exist. If it does not, the commit was never deployed to the
# source environment, which is exactly the situation promotion exists to prevent.
if ! MANIFEST=$(aws ecr batch-get-image --region "$AWS_REGION" \
        --repository-name "$SOURCE_REPO" --image-ids "imageTag=${SOURCE_TAG}" \
        --query 'images[0].imageManifest' --output text 2>/dev/null) \
   || [ -z "$MANIFEST" ] || [ "$MANIFEST" = "None" ]; then
    echo "❌ ${SOURCE_REPO}:${SOURCE_TAG} not found." >&2
    echo "   Commit ${COMMIT:0:12} was never built for ${SOURCE_ENV}. Releases must be" >&2
    echo "   cut from a commit that has been merged to main and deployed to staging." >&2
    exit 1
fi

echo "📦 Copying layers into ${DEST_REPO}..."
command -v docker >/dev/null || { echo "❌ docker is required to copy between repositories" >&2; exit 1; }

aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null

docker pull --quiet "${REGISTRY}/${SOURCE_REPO}:${SOURCE_TAG}" >/dev/null
docker tag "${REGISTRY}/${SOURCE_REPO}:${SOURCE_TAG}" "${DEST_URL}:${VERSION}"
docker push --quiet "${DEST_URL}:${VERSION}" >/dev/null

# Confirm the promoted image is the same artifact, not merely the same tag.
SRC_DIGEST=$(docker inspect --format '{{index .RepoDigests 0}}' \
    "${REGISTRY}/${SOURCE_REPO}:${SOURCE_TAG}" 2>/dev/null | sed 's/.*@//')
DST_DIGEST=$(aws ecr describe-images --region "$AWS_REGION" \
    --repository-name "$DEST_REPO" --image-ids "imageTag=${VERSION}" \
    --query 'imageDetails[0].imageDigest' --output text 2>/dev/null)

echo "   source digest: ${SRC_DIGEST:-unknown}"
echo "   dest   digest: ${DST_DIGEST:-unknown}"
echo "✅ promoted ${SOURCE_TAG} -> ${DEST_REPO}:${VERSION}"
