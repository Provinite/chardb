#!/bin/bash

# LocalStack initialization script
# This script runs when LocalStack is ready and sets up the S3 bucket for local development

echo "Initializing LocalStack S3 bucket..."

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

echo "S3 bucket 'chardb-images' created and configured successfully"

# List buckets to verify
awslocal s3 ls
