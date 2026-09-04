#!/bin/bash

# LocalStack initialization script
# This script runs when LocalStack is ready and sets up AWS resources for local development
#
# Resource names come from the environment (services/localstack.yml passes them
# through) so each instance can own its own bucket and queue. The defaults are
# the names the primary instance has always used.

BUCKET="${S3_IMAGES_BUCKET:-chardb-images}"
QUEUE="${SQS_PRIZE_QUEUE:-chardb-prize-distribution}"

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

# ========================================
# SQS Setup
# ========================================
echo "Setting up SQS queues..."

# Create Dead Letter Queue first
DLQ_URL=$(awslocal sqs create-queue \
  --queue-name "${QUEUE}-dlq" \
  --attributes '{
    "MessageRetentionPeriod": "1209600"
  }' \
  --output text --query 'QueueUrl')

echo "✓ Dead Letter Queue created: $DLQ_URL"

# Get DLQ ARN for main queue configuration
DLQ_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url "$DLQ_URL" \
  --attribute-names QueueArn \
  --output text --query 'Attributes.QueueArn')

# Create main prize distribution queue with DLQ
QUEUE_URL=$(awslocal sqs create-queue \
  --queue-name "${QUEUE}" \
  --attributes "{
    \"VisibilityTimeout\": \"30\",
    \"MessageRetentionPeriod\": \"345600\",
    \"ReceiveMessageWaitTimeSeconds\": \"5\",
    \"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":3}\"
  }" \
  --output text --query 'QueueUrl')

echo "✓ Main queue created: $QUEUE_URL"

# List all queues to verify
echo ""
echo "All queues:"
awslocal sqs list-queues

echo ""
echo "LocalStack initialization complete!"
