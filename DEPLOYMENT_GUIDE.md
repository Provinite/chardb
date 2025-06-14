# Complete ThClone Infrastructure Deployment Guide

Based on my comprehensive analysis of the infrastructure and deployment setup, here's the detailed workflow for deploying ThClone from scratch:

## 📋 Prerequisites and Setup

### 1. **Required Tools Installation**
```bash
# Install Terraform (if not already installed)
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform

# Install AWS CLI v2 (if not already installed)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Install Docker (if not already installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 2. **AWS Account Setup**
```bash
# Configure AWS credentials (requires AWS account with appropriate permissions)
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and Region (us-east-1 recommended)

# Verify AWS access
aws sts get-caller-identity
```

### 3. **Required AWS Permissions**
Your AWS user/role needs these permissions:
- EC2 (full access for instances, security groups, key pairs)
- ECR (full access for container registry)
- S3 (for Terraform state storage)
- IAM (for role creation)
- API Gateway (if using HTTPS termination)
- CloudWatch (for logging and monitoring)

## 🚀 Phase 1: Infrastructure Provisioning

### Step 1: **Terraform State Backend Setup**
```bash
# Navigate to project root
cd /path/to/thclone

# Create S3 bucket for Terraform state (one-time setup)
aws s3 mb s3://clovercoin-tf-state --region us-east-1
aws s3api put-bucket-versioning --bucket clovercoin-tf-state --versioning-configuration Status=Enabled
```

### Step 2: **Environment Configuration**
```bash
# Choose your environment (dev or prod)
export ENVIRONMENT=prod  # or dev

# Navigate to the environment directory
cd infra/environments/$ENVIRONMENT
```

### Step 3: **Configure Environment Variables**
Edit the `.tfvars` file for your environment:

**For Production (`infra/environments/prod/prod.tfvars`):**
```hcl
# Update with your specific IP for SSH access
backend_ssh_allowed_cidr_blocks = ["YOUR_IP_ADDRESS/32"]

# Optional customizations:
backend_instance_type = "t4g.micro"        # Cost-effective ARM instance
backend_root_volume_size = 20              # GB
backend_enable_api_gateway = true          # Enable HTTPS via API Gateway
```

**For Development (`infra/environments/dev/dev.tfvars`):**
```hcl
# More permissive for development
backend_ssh_allowed_cidr_blocks = ["0.0.0.0/0"]  # Allow from anywhere (dev only!)
backend_instance_type = "t3.medium"              # More powerful for development
backend_enable_api_gateway = false               # Direct access for simplicity
```

### Step 4: **Initialize and Apply Terraform**
```bash
# Initialize Terraform (first time only)
terraform init

# Plan the infrastructure changes
terraform plan -var-file="${ENVIRONMENT}.tfvars"

# Apply the infrastructure (this will create AWS resources)
terraform apply -var-file="${ENVIRONMENT}.tfvars"
# Type 'yes' when prompted

# Save the outputs for later use
terraform output > terraform-outputs.txt
```

**Expected Infrastructure Created:**
- ✅ ECR repository for Docker images
- ✅ EC2 instance with Docker installed
- ✅ Security groups with appropriate ports (22, 80, 443, 3000-8000, 16686)
- ✅ SSH key pair (auto-generated and stored in Terraform state)
- ✅ Elastic IP for static addressing
- ✅ IAM roles and policies
- ✅ API Gateway (if enabled)

## 🏗️ Phase 2: Application Build and Deployment

### Step 5: **Build and Push Docker Images**
```bash
# Return to project root
cd ../../../

# Build and push backend image to ECR
./scripts/build-and-push.sh $ENVIRONMENT latest

# This script will:
# - Get ECR repository URL from Terraform
# - Login to ECR
# - Build backend Docker image
# - Push to ECR with 'latest' and custom tags
```

### Step 6: **Deploy Application to Infrastructure**
```bash
# Deploy the application using the deployment script
./deploy.sh $ENVIRONMENT latest

# This script will:
# - Get server IP and SSH key from Terraform
# - Copy docker compose files to EC2
# - SSH into EC2 and start services
# - Perform health checks
```

**What Gets Deployed:**
- ✅ Backend API (NestJS/GraphQL) on port 4000
- ✅ PostgreSQL database (containerized) on port 5432
- ✅ Jaeger UI (observability) on port 16686
- ✅ OpenTelemetry Collector for metrics/tracing

## 🗄️ Phase 3: Database Initialization

### Step 7: **Initialize Database Schema**
```bash
# Get server IP from Terraform
export SERVER_IP=$(cd infra/environments/$ENVIRONMENT && terraform output -raw backend_public_ip)
export SSH_KEY_PATH=$(cd infra/environments/$ENVIRONMENT && terraform output -raw backend_ssh_private_key | tee ~/.ssh/thclone-$ENVIRONMENT.pem && chmod 600 ~/.ssh/thclone-$ENVIRONMENT.pem && echo ~/.ssh/thclone-$ENVIRONMENT.pem)

# SSH into the server
ssh -i $SSH_KEY_PATH ec2-user@$SERVER_IP

# Inside the server, run database migrations
cd ~/app
docker compose exec backend yarn workspace @thclone/backend db:push

# Optional: Run database seed data (if available)
docker compose exec backend yarn workspace @thclone/backend db:seed

# Exit SSH session
exit
```

## ✅ Phase 4: Verification and Testing

### Step 8: **Verify Deployment**
```bash
# Check application health
curl http://$SERVER_IP:4000/health

# Expected response: {"status":"ok","timestamp":"..."}

# Test GraphQL endpoint
curl -X POST http://$SERVER_IP:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}'

# Access Jaeger UI for observability
echo "Jaeger UI: http://$SERVER_IP:16686"

# Check service status on server
ssh -i $SSH_KEY_PATH ec2-user@$SERVER_IP "cd ~/app && docker compose ps"
```

### Step 9: **Configure Environment Variables (if needed)**
The application uses environment variables that are configured automatically, but you may want to customize:

```bash
# SSH into server
ssh -i $SSH_KEY_PATH ec2-user@$SERVER_IP

# View current environment configuration
cd ~/app && cat docker compose.yml

# To update environment variables, edit docker compose.yml and restart:
# docker compose down && docker compose up -d
```

**Key Environment Variables Configured:**
- `DATABASE_URL`: PostgreSQL connection (auto-configured for container networking)
- `JWT_SECRET`: Auto-generated secure random string
- `NODE_ENV`: Set to 'production'
- `FRONTEND_URL`: Configured for CORS
- `OTEL_*`: OpenTelemetry tracing configuration

## 🔄 Ongoing Deployments

### For Application Updates:
```bash
# 1. Build and push new image with version tag
./scripts/build-and-push.sh $ENVIRONMENT v1.2.3

# 2. Deploy the new version
./deploy.sh $ENVIRONMENT v1.2.3
```

### For Infrastructure Updates:
```bash
# 1. Make changes to Terraform files
# 2. Plan and apply changes
cd infra/environments/$ENVIRONMENT
terraform plan -var-file="${ENVIRONMENT}.tfvars"
terraform apply -var-file="${ENVIRONMENT}.tfvars"
```

## 🛠️ Troubleshooting

### Common Issues:

**1. ECR Authentication Errors:**
```bash
# Re-authenticate with ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com
```

**2. SSH Connection Issues:**
```bash
# Verify SSH key permissions
chmod 600 ~/.ssh/thclone-$ENVIRONMENT.pem

# Check security group allows your IP
aws ec2 describe-security-groups --filters "Name=group-name,Values=*backend*"
```

**3. Service Health Issues:**
```bash
# Check container logs
ssh -i $SSH_KEY_PATH ec2-user@$SERVER_IP "cd ~/app && docker compose logs backend"

# Restart services if needed
ssh -i $SSH_KEY_PATH ec2-user@$SERVER_IP "cd ~/app && docker compose restart"
```

**4. Database Connection Issues:**
```bash
# Check database container status
ssh -i $SSH_KEY_PATH ec2-user@$SERVER_IP "cd ~/app && docker compose logs postgres"

# Re-run database setup if needed
ssh -i $SSH_KEY_PATH ec2-user@$SERVER_IP "cd ~/app && docker compose exec backend yarn workspace @thclone/backend db:push"
```

## 🧹 Cleanup

### To Destroy Infrastructure (when no longer needed):
```bash
cd infra/environments/$ENVIRONMENT
terraform destroy -var-file="${ENVIRONMENT}.tfvars"
# Type 'yes' when prompted

# This will remove all AWS resources and stop billing
```

## 💰 Cost Estimation

**Approximate monthly costs for production setup:**
- EC2 t4g.micro: ~$6-8/month
- Elastic IP: ~$3.60/month (when not attached to running instance)
- ECR storage: ~$0.10/GB/month
- Data transfer: Variable based on usage
- **Total: ~$10-15/month** for basic usage

## 🚀 Alternative: GitHub Actions CI/CD

For automated deployments, the project includes GitHub Actions workflows:
1. **CI Pipeline** (`.github/workflows/ci.yml`): Automated testing and image building
2. **Deploy Pipeline** (`.github/workflows/deploy.yml`): Automated deployment to staging/production

To use GitHub Actions instead of manual deployment:
1. Configure AWS credentials as GitHub secrets
2. Push code changes to trigger CI
3. Approve deployment to production via GitHub UI

## 📊 Monitoring and Observability

Once deployed, you have access to:
- **Application Logs**: `docker compose logs backend`
- **Database Logs**: `docker compose logs postgres`
- **Distributed Tracing**: Jaeger UI at `http://$SERVER_IP:16686`
- **Health Endpoint**: `http://$SERVER_IP:4000/health`
- **GraphQL Playground**: `http://$SERVER_IP:4000/graphql` (development mode)

This completes the full deployment workflow for ThClone infrastructure and application. The setup provides a production-ready environment with proper security, observability, and scalability foundations.