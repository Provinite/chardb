#!/bin/bash

# LocalStack initialization script
# This script runs when LocalStack is ready and sets up AWS resources for local development
#
# These names are the same in every instance on purpose: each instance runs its
# own LocalStack, so isolation comes from the container, not from the name. Only
# the port differs (LOCALSTACK_PORT), and the backend's AWS_ENDPOINT_URL follows
# it. See docs/PARALLEL_INSTANCES.md.

BUCKET="chardb-images"

echo "Initializing LocalStack resources..."

# ========================================
# S3 Setup
# ========================================
echo "Setting up S3 bucket..."

# Create the images bucket
awslocal s3 mb "s3://${BUCKET}"

# Set bucket policy to allow public read access (for local dev)
awslocal s3api put-bucket-acl --bucket "${BUCKET}" --acl public-read

# Enable CORS for the bucket
awslocal s3api put-bucket-cors --bucket "${BUCKET}" --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}'

echo "✓ S3 bucket '${BUCKET}' created and configured"

echo ""
echo "LocalStack initialization complete!"
