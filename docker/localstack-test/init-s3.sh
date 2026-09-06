#!/bin/bash
# Creates the bucket the browser e2e suite uploads into.
#
# Only S3, and only the bucket: the suite sets AWS_SQS_ENABLED=false, and the
# queue setup in the sibling docker/localstack/init-aws.sh exists for the dev
# stack's Discord consumer, which no spec exercises.
#
# The bucket NAME matches the dev stack's on purpose. Isolation here comes from
# this being a separate container on a separate port, not from a separate name,
# so the backend needs no bucket override to run under the suite.

BUCKET="chardb-images"

awslocal s3 mb "s3://${BUCKET}"
awslocal s3api put-bucket-acl --bucket "${BUCKET}" --acl public-read

echo "e2e S3 bucket '${BUCKET}' ready"
