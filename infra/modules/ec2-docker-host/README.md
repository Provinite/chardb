# EC2 Docker Host Module

This module creates an EC2 instance with Docker and supporting tools installed, ready for application deployment.

## Purpose

**Infrastructure Provisioning Only**: This module handles one-time system setup and global dependencies. Application deployment is handled separately.

## What This Module Does

### System Setup
- Installs Docker and Docker Compose
- Installs AWS CLI v2 for ECR access
- Installs Node.js for deployment scripts
- Creates deployment directory (`/home/ec2-user/app`)
- Sets up proper user permissions

### Security & Networking
- Uses default VPC (no additional networking costs)
- Creates security group with common ports:
  - SSH (22)
  - HTTP/HTTPS (80, 443)
  - Application ports (3000-8000)
  - Jaeger UI (16686)
- Elastic IP for static address

### Deployment Helpers
- ECR login script (`/home/ec2-user/ecr-login.sh`)
- Deployment-ready environment

## What This Module Does NOT Do

- ❌ Deploy applications
- ❌ Start services
- ❌ Create docker compose files
- ❌ Configure application-specific settings

## Usage

```hcl
module "backend_docker_host" {
  source = "../../../infra/modules/ec2-docker-host"

  name           = "myapp-backend-dev"
  instance_type  = "t3.medium"
  ssh_public_key = "ssh-rsa AAAAB3..."
  
  ecr_repository_url = "123456789.dkr.ecr.us-east-1.amazonaws.com/myapp"
  aws_region         = "us-east-1"
}
```

## After Infrastructure Deployment

1. **Get server IP**: `terraform output public_ip`
2. **Deploy application**: Use deployment scripts or manual process
3. **SSH access**: `ssh -i ~/.ssh/key ec2-user@<ip>`

## File Structure

```
infra/modules/ec2-docker-host/
├── main.tf          # Module definition
├── variables.tf     # Input variables  
├── outputs.tf       # Output values
├── user_data.sh     # System setup script
└── README.md        # This file
```

## Benefits

- **Clean Separation**: Infrastructure vs application deployment
- **Cost Effective**: Uses default VPC
- **Flexible**: Deploy any containerized application
- **Reusable**: Not tied to specific application structure