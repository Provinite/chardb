#!/bin/bash

# LocalStack initialization script
# This script runs when LocalStack is ready and sets up AWS resources for local development

echo "Initializing LocalStack resources..."

# ========================================
# S3 Setup
# ========================================
echo "Setting up S3 bucket..."

# Create the chardb-images bucket
awslocal s3 mb s3://chardb-images

# Set bucket policy to allow public read access (for local dev)
awslocal s3api put-bucket-acl --bucket chardb-images --acl public-read

# Enable CORS for the bucket
awslocal s3api put-bucket-cors --bucket chardb-images --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}'

echo "✓ S3 bucket 'chardb-images' created and configured"

# ========================================
# SQS Setup
# ========================================
echo "Setting up SQS queues..."

# Create Dead Letter Queue first
DLQ_URL=$(awslocal sqs create-queue \
  --queue-name chardb-prize-distribution-dlq \
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
  --queue-name chardb-prize-distribution \
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
