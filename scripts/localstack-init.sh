#!/bin/bash

# LocalStack initialization script
# This script runs when LocalStack is ready and sets up initial resources

echo "Initializing LocalStack resources..."

# Set AWS CLI to use LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

# Create S3 bucket for images
echo "Creating S3 bucket: chardb-images-local"
awslocal s3 mb s3://chardb-images-local

# Configure CORS for the bucket (needed for presigned URLs in the future)
echo "Configuring CORS for S3 bucket"
awslocal s3api put-bucket-cors --bucket chardb-images-local --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}'

echo "LocalStack initialization complete!"
echo "S3 bucket 'chardb-images-local' is ready at: http://localhost:4566"
