# CharDB Infrastructure

This directory contains the Terraform infrastructure-as-code for the CharDB application, designed for a simplified and cost-effective deployment.

## Architecture

- **S3 + CloudFront** for frontend static hosting
- **Single EC2 instance** for backend services with Docker containers:
  - Backend API (Node.js/GraphQL)
  - PostgreSQL database
  - OTEL collector for telemetry
  - Jaeger for distributed tracing
- **API Gateway** (optional) for HTTPS termination and SSL certificate management
- **Network Load Balancer** (when using API Gateway) for VPC Link integration
- **ECR** for backend container image storage
- **Elastic IP** for static backend address

## Directory Structure

```
infra/
├── modules/                    # Reusable Terraform modules
│   ├── ecr/                   # ECR repository module
│   ├── ec2-docker-host/       # EC2 instance with Docker containers
│   ├── api-gateway/           # API Gateway with HTTPS termination
│   └── s3-static-site/        # S3 + CloudFront static hosting
└── environments/              # Environment-specific configurations
    ├── dev/                   # Development environment
    └── prod/                  # Production environment

apps/
├── backend/infrastructure/    # Backend EC2 infrastructure with optional API Gateway
└── frontend/infrastructure/   # Frontend S3 infrastructure
```

## Deployment

Single deployment from environment directory includes all infrastructure:

```bash
# Development
cd infra/environments/dev
terraform init
terraform plan -var-file="dev.tfvars"
terraform apply -var-file="dev.tfvars"

# Production  
cd infra/environments/prod
terraform init
terraform plan -var-file="prod.tfvars"
terraform apply -var-file="prod.tfvars"
```

**State Management**: Uses S3 backend with keys:
- Dev: `chardb/environments/dev`
- Prod: `chardb/environments/prod`
- Bucket: `clovercoin-tf-state`

This single deployment creates:
- ECR repository for backend images
- EC2 instance with Docker containers
- Network Load Balancer (if API Gateway enabled)
- API Gateway with HTTPS termination (if enabled)
- All necessary IAM roles and security groups

## Required Variables

### Prerequisites
- S3 bucket `clovercoin-tf-state` must exist in `us-east-1`
- SSH keys are auto-generated during deployment

### Environment-specific (in `.tfvars` files)
- `environment`: Environment name (dev/prod)
- `aws_region`: AWS region
- `backend_instance_type`: EC2 instance type
- `backend_root_volume_size`: Disk size in GB
- `backend_ssh_allowed_cidr_blocks`: IP ranges for SSH access
- `backend_enable_api_gateway`: Whether to enable API Gateway for HTTPS (boolean)
- `frontend_*`: Frontend configuration (when frontend module is added)

### Frontend Infrastructure
- `environment`: Environment name (dev/prod)
- `domain_name`: Custom domain name (optional)
- `acm_certificate_arn`: ACM certificate ARN for HTTPS (optional)
- `route53_zone_id`: Route53 hosted zone ID (optional)

## ECR Repository

The infrastructure creates one ECR repository for the backend:
- `chardb-backend-{environment}`

## Services

### Backend Services (on EC2)
- **Backend API**: GraphQL API running on port 4000
- **PostgreSQL**: Database running on port 5432
- **Jaeger UI**: Tracing interface on port 16686
- **OTEL Collector**: Telemetry collection on port 4317

### Frontend
- **S3 + CloudFront**: Static React app with global CDN

## Security

- EC2 instance uses security groups with specific port access
- IAM roles follow least privilege principle  
- ECR repository includes vulnerability scanning
- S3 bucket uses Origin Access Control for CloudFront-only access
- All data encrypted at rest and in transit

## Monitoring

- All containers send traces to Jaeger via OTEL collector
- CloudWatch logs for EC2 instance
- CloudFront access logs and metrics
- PostgreSQL and application metrics via OTEL

## Scaling

- **Backend**: Vertical scaling by changing EC2 instance type
- **Frontend**: Auto-scaling via CloudFront global distribution
- **Database**: Single PostgreSQL instance (can be upgraded to RDS later)

## Environment Differences

### Development
- Mutable ECR image tags
- Smaller EC2 instance (t3.medium)
- CloudFront PriceClass_100 (US, Canada, Europe)
- HTTP backend access allowed

### Production
- Immutable ECR image tags (recommended)
- Larger EC2 instance (t3.large or bigger)
- CloudFront PriceClass_All (global distribution)
- HTTPS with ACM certificate
- Restricted SSH access

## Management

### Accessing the Backend Server
```bash
# SSH into the EC2 instance
ssh -i ~/.ssh/your-key ec2-user@<elastic-ip>

# View running containers
docker compose ps

# View logs
docker compose logs backend
docker compose logs postgres

# Deploy new backend version
./deploy.sh
```

### Frontend Deployment
```bash
# Build React app
yarn workspace @chardb/frontend build

# Upload to S3 (use AWS CLI or deployment pipeline)
aws s3 sync dist/ s3://bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

## Application Deployment

After infrastructure is provisioned, deploy the application separately:

```bash
# Get the server IP from Terraform output
cd apps/backend/infra
SERVER_IP=$(terraform output -raw public_ip)

# Deploy the application
cd ../../../
./deploy.sh $SERVER_IP

# Or deploy manually
ssh -i ~/.ssh/your-key ec2-user@$SERVER_IP
./ecr-login.sh
# Copy your docker compose.yml and run: docker compose up -d
```

### Accessing Services
- **Backend API**: 
  - With API Gateway: `https://<api-gateway-url>/graphql` or custom domain
  - Direct EC2: `http://<server-ip>:4000/graphql`
- **Jaeger UI**: `http://<server-ip>:16686`
- **Frontend**: `https://<cloudfront-domain>` or custom domain

## API Gateway vs Direct Access

### API Gateway (Production Recommended)
**Advantages:**
- HTTPS termination with AWS-managed SSL certificates
- Custom domain support with ACM certificates
- AWS WAF integration capability
- CloudWatch logging and metrics
- Request/response transformation capabilities
- Rate limiting and throttling

**Disadvantages:**
- Additional cost (~$3.50/month + $1.29 per million requests)
- Slight latency overhead (~10-50ms)
- Complexity in setup

### Direct EC2 Access (Development)
**Advantages:**
- Lower cost (no API Gateway charges)
- Simpler setup
- Lower latency
- Direct access to all ports

**Disadvantages:**
- No built-in HTTPS (would need SSL setup on EC2)
- No custom domain without additional Route53 setup
- Manual SSL certificate management

**Recommendation:** Use API Gateway for production environments and direct access for development.