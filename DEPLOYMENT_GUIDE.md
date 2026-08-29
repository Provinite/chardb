# Complete CharDB Full-Stack Deployment Guide

This guide covers deployment of both **backend** (EC2 + Docker) and **frontend** (S3 + CloudFront) infrastructure and applications.

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
cd /path/to/chardb

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
# Your address only. Never 0.0.0.0/0: this opens sshd to the internet, and the
# host is reachable over Session Manager anyway (see below), so the rule is a
# fallback rather than the primary path.
backend_ssh_allowed_cidr_blocks = ["YOUR_IP_ADDRESS/32"]

# The staging host is a t4g.micro. It has ~910 MB of RAM and no swap, so what
# runs on it is deliberately kept small.
backend_instance_type = "t4g.micro"
backend_enable_api_gateway = false
```

This file is gitignored and, since the OAuth secrets moved to Parameter Store,
holds only the CIDR above and the three OAuth callback URLs — no secrets.

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

**Backend Infrastructure:**
- ✅ ECR repository for Docker images
- ✅ EC2 instance with Docker installed
- ✅ Security group opening 22 (your address only), 80, 443 and 4000
- ✅ SSH key pair (auto-generated and stored in Terraform state)
- ✅ Elastic IP for static addressing
- ✅ IAM roles and policies
- ✅ API Gateway (if enabled)

**Frontend Infrastructure:**
- ✅ S3 bucket for static website hosting
- ✅ CloudFront distribution with optimized caching
- ✅ Origin Access Control (OAC) for secure S3 access
- ✅ Custom error pages for SPA routing (404/403 → index.html)
- ✅ Environment-specific cache settings (dev: no cache, prod: optimized)

## 🔑 Application Secrets

Secrets live in **SSM Parameter Store** under `/chardb/<environment>/`, not in
Terraform variables and not in a `.tfvars` file.

Terraform creates each parameter with the placeholder `not-managed-by-terraform`
and then carries `lifecycle { ignore_changes = [value] }`, so it never
overwrites the real value. Setting or rotating one is a single command with no
Terraform run and no plan diff:

```bash
aws ssm put-parameter --overwrite --type SecureString \
  --name /chardb/dev/discord-bot-token --value 'the-real-token'
```

Two parameters are the exception, and deliberately stay Terraform-managed
because Terraform *generates* their value: `/chardb/prod/jwt-secret` (a
`random_password`) and `/chardb/prod/database-url` (built from the RDS password
Terraform created). Writing a placeholder over those would break the app.

> **The values are still in Terraform state.** `ignore_changes` stops Terraform
> writing a value, not reading one — every refresh fetches the decrypted
> parameter and stores it. So "read the state bucket" still implies "read every
> application secret". See issue #255 for the fix, which needs Terraform ≥ 1.11.

### Why not Terraform variables

The OAuth secrets used to be declared as Terraform inputs, supplied from a
gitignored `.tfvars`, and then re-exported as Terraform outputs for the deploy to
read back. That made Terraform state their only durable record and the `.tfvars`
file a hand-maintained cache of Terraform's own output — the dev file's header
still records a round trip through it ("DeviantArt/Discord pulled from terraform
state"). Practical consequences: only the machine holding `.tfvars` could apply,
and a secret rotated in Discord's dashboard drifted silently because re-applying
just pushed the stale value back.

### ⚠️ Migrating prod off Secrets Manager

Prod's eight Secrets Manager secrets are replaced by Parameter Store
parameters. This takes **two applies**, and the order is not optional:

- A single apply would create the parameters holding
  `not-managed-by-terraform` *and* repoint the task definition at them in the
  same run, so ECS would inject placeholders into production.
- Creating the parameters by hand first does not help either: Terraform would
  then try to create resources that already exist and fail with
  `ParameterAlreadyExists`, since the module does not set `overwrite`.

So let Terraform create them empty, fill them, then apply the rest.

```bash
cd infra/environments/prod

# 1. Create only the parameters. Nothing else in the plan runs, so the task
#    definition still points at Secrets Manager and prod keeps working.
terraform apply -var-file=prod.tfvars -target=module.app_secrets

# 2. Copy each live value across. Old name -> new name:
#      chardb-prod-deviantart-secret  ->  /chardb/prod/deviantart-client-secret
#      chardb-prod-toyhouse-secret    ->  /chardb/prod/toyhouse-client-secret
#      chardb-prod-discord-secret     ->  /chardb/prod/discord-client-secret
#      chardb-prod-discord-bot-token  ->  /chardb/prod/discord-bot-token
#      chardb-prod-otel-otlp-headers  ->  /chardb/prod/otel-otlp-headers
#
#    Piped directly so the value is never printed:
for pair in \
  "chardb-prod-deviantart-secret:/chardb/prod/deviantart-client-secret" \
  "chardb-prod-toyhouse-secret:/chardb/prod/toyhouse-client-secret" \
  "chardb-prod-discord-secret:/chardb/prod/discord-client-secret" \
  "chardb-prod-discord-bot-token:/chardb/prod/discord-bot-token" \
  "chardb-prod-otel-otlp-headers:/chardb/prod/otel-otlp-headers"
do
  src="${pair%%:*}"; dst="${pair##*:}"
  aws ssm put-parameter --overwrite --type SecureString --name "$dst" \
    --value "$(aws secretsmanager get-secret-value \
                 --secret-id "$src" --query SecretString --output text)" \
    >/dev/null && echo "copied -> $dst"
done

# 3. Confirm nothing still holds the placeholder before going further.
aws ssm get-parameters-by-path --path /chardb/prod --recursive --with-decryption \
  --query "Parameters[?Value=='not-managed-by-terraform'].Name" --output text

# 4. Full apply: repoints the task definition and destroys the old secrets.
terraform apply -var-file=prod.tfvars
```

`jwt-secret` and `database-url` are not in that list on purpose — Terraform
generates those values, so it writes them itself in step 4.

The destroyed Secrets Manager entries keep AWS's 30-day recovery window, so a
botched cutover is recoverable with `aws secretsmanager restore-secret`.

Afterwards, delete these five now-undeclared lines from your local
`prod.tfvars`, or Terraform will warn about them on every run:
`deviantart_client_secret`, `discord_client_secret`, `toyhouse_client_secret`,
`discord_bot_token`, `otel_otlp_headers`.

### How dev reads them

`deploy.sh` no longer writes the OAuth client ids, client secrets or bot token
into the `.env` it uploads. The deploy script running on the host reads them from
`/chardb/dev/` with its instance role and appends them to `.env` there, so
`docker compose up -d` run by hand on the box keeps working. It aborts the
deploy if any parameter is missing or still holds the placeholder.

The matching Terraform variables and outputs are gone, so `dev.tfvars` now needs
only `backend_ssh_allowed_cidr_blocks` and the three callback URLs — no secrets.

> Note: the values are still present in Terraform state, because Terraform
> creates the parameters and reads them back on refresh. See issue #255.

## 🤖 Continuous Deployment to Staging

**A push to `main` deploys itself.** Once `lint`, `verify` and `e2e` pass, the
`deploy-backend` and `deploy-frontend` jobs in `.github/workflows/ci.yml` run the
same chain the manual sections below describe. The rest of Phase 2 is for first-time
setup, for the `prod` environment, and for deploying from a branch by hand.

### How the workflow reaches AWS

There is no AWS access key in this repository — it is public. The jobs assume an
IAM role through GitHub's OIDC provider instead, and its permissions stop at
*reading* Terraform state: the deploy can never change infrastructure.

Two claims on the minted token are pinned, and a job must satisfy both:

| Claim | Required value | Comes from |
| --- | --- | --- |
| `sub` | `repo:Provinite/chardb:environment:staging` | the job's `environment: staging` |
| `ref` | `refs/heads/main` | the branch the run is on |

The `ref` pin is the reason both are needed. An environment subject says nothing
about which branch deployed to it, so on its own it would let a run from any
branch that targets `staging` assume the role.

> ⚠️ `environment: staging` in the workflow is load-bearing. Removing or
> renaming it changes the `sub` claim and the AWS login fails with "Not
> authorized to perform sts:AssumeRoleWithWebIdentity". Change
> `github_deploy_environment` in `infra/environments/dev` alongside it.

This is also what gives you a per-environment approval gate later: point a
production role's trust policy at `repo:Provinite/chardb:environment:production`
and add a required reviewer to that environment, and the role becomes
unassumable until someone approves. That is enforced when the token is minted,
which branch protection is not.

### How the workflow reaches the host

SSH is tunnelled over AWS Systems Manager Session Manager. The instance carries
`AmazonSSMManagedInstanceCore`, and both `deploy.sh` and `scripts/ssh-dev.sh`
address it by instance id through an `aws ssm start-session` `ProxyCommand` (see
`scripts/lib/remote-host.sh`). The tunnel emerges on the instance's own loopback,
so the security group never needs to name a GitHub runner IP.

This is also the local default, so **install the Session Manager plugin**:

```bash
# https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html
curl -fsSLo /tmp/session-manager-plugin.deb \
  "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb"
sudo dpkg -i /tmp/session-manager-plugin.deb
```

If the SSM agent is unhealthy, fall back to a direct connection from an address
listed in `backend_ssh_allowed_cidr_blocks`:

```bash
DEPLOY_TRANSPORT=direct ./scripts/ssh-dev.sh
DEPLOY_TRANSPORT=direct ./deploy.sh dev latest
```

### One-time setup

```bash
# 1. Create the OIDC provider, deploy role and SSM instance permissions.
cd infra/environments/dev
terraform apply -var-file=dev.tfvars

# 2. Put real values in the parameters the apply just created. They hold
#    "not-managed-by-terraform" until you do, and the deploy refuses to start
#    while any of them still does.
for name in deviantart-client-id deviantart-client-secret \
            discord-client-id discord-client-secret discord-bot-token \
            toyhouse-client-id toyhouse-client-secret; do
  aws ssm put-parameter --overwrite --type SecureString \
    --name "/chardb/dev/$name" --value 'REPLACE_ME'
done

#    Then confirm none are left. This is the same check the deploy runs, so an
#    empty result here means the deploy will get past it.
aws ssm get-parameters-by-path --path /chardb/dev --recursive --with-decryption \
  --query "Parameters[?Value=='not-managed-by-terraform'].Name" --output text

# 3. Create the staging environment and restrict it to main. Without the branch
#    policy, a run on any branch could target it -- the trust policy's `ref` pin
#    already blocks that, so this is defence in depth rather than the control.
gh api -X PUT repos/Provinite/chardb/environments/staging \
  -F 'deployment_branch_policy[protected_branches]=false' \
  -F 'deployment_branch_policy[custom_branch_policies]=true'
gh api -X POST repos/Provinite/chardb/environments/staging/deployment-branch-policies \
  -f name='main' -f type='branch'

# 4. Hand the role ARN to the environment, not the repository, so a production
#    environment can later carry a different one under the same name.
gh secret set AWS_DEPLOY_ROLE_ARN --env staging \
  --body "$(terraform output -raw github_actions_deploy_role_arn)"

# 5. Confirm the host registered as an SSM managed node (takes a few minutes).
aws ssm describe-instance-information \
  --query 'InstanceInformationList[].{Id:InstanceId,Ping:PingStatus}' --output table
```

The role ARN is not really a secret, but keeping it in one avoids publishing the
AWS account id in a public repository.

### What the jobs do

| Job | Runner | Steps |
| --- | --- | --- |
| `deploy-backend` | `ubuntu-24.04-arm` | Build the arm64 image natively, push to ECR as `v-<sha>`, deploy over the SSM tunnel, then poll `/health` for up to 5 minutes |
| `deploy-frontend` | `ubuntu-latest` | Build the bundle against the deployed API URL, `s3 sync --delete`, invalidate CloudFront |

`deploy-frontend` waits on `deploy-backend` so a bundle never ships expecting a
schema the deployed API does not have yet. Both hold non-cancelling concurrency
groups, and a run on `main` is never cancelled by a newer push — a cancelled
deploy could leave the host with images pulled and no containers running.

Database migrations need no step of their own: the backend image's entrypoint
(`scripts/migrate-and-start.sh`) runs `prisma migrate deploy` before the app boots.

## 🏷️ Releasing to Production

**Publishing a GitHub release deploys it.** `.github/workflows/release.yml`
promotes the image staging already ran into the production repository under the
release tag, registers an ECS task definition revision carrying it, and rolls
the service onto it. The frontend follows, built with the tag as `VITE_VERSION`.

The backend is **promoted, not rebuilt**. A rebuild produces a different
artifact -- different layer digests, and any unpinned transitive dependency can
resolve differently -- so production would run something staging never tested.
Staging tags its images `v-<first 12 of sha>` on every merge to `main`, and the
release looks up the tag's commit to find it. Promotion is skipped when the
production repository already has the tag, so re-running a release is cheap.

This means **a release must be cut from a commit staging has deployed**. If it
was not, the promotion fails with a message saying so rather than quietly
building something new.

```bash
# cut a release from main
gh release create v10.2.0 --generate-notes

# or redeploy one that already exists
gh workflow run release.yml -f tag=v10.2.0
```

### Why the deploy derives from Terraform's revision

The ECS service ignores `task_definition` changes, so an apply cannot revert
production to an older release. The cost is that a task definition change made
in Terraform does not deploy itself.

`scripts/deploy-prod-release.sh` closes that gap: it reads the
`ecs_task_definition_arn` output -- the revision **Terraform** last created, not
the one currently running -- swaps only the image, and registers from there. Any
Terraform change to the definition is therefore picked up by the next release.

Deriving from the *running* revision instead would compound: each deploy would
build on the last deploy and Terraform's changes would never land.

### Guards

- **The tag must be an ancestor of `main`.** A release can be cut from any
  commit, and production runs migrations at container start, so an unmerged
  commit could change the schema in ways `main` does not describe.
- **The image must already exist** in both repositories at the right moments:
  in staging's for the promotion to find, and in production's before the
  service is touched. Either missing fails the deploy rather than leaving ECS
  unable to pull.
- **The `production` environment gates it.** The deploy role's trust policy pins
  the OIDC subject to that environment, so protection rules on it are enforced
  before AWS mints a token. To require approval:
  ```bash
  gh api -X PUT repos/Provinite/chardb/environments/production \
    -F 'reviewers[][type]=User' -F "reviewers[][id]=$(gh api user --jq .id)"
  ```

### Rollback

Redeploy the previous tag:

```bash
gh workflow run release.yml -f tag=v10.1.0
```

Note the ECR lifecycle policy keeps only the **last 10** images tagged `v*`, so
releases older than that are no longer pullable. For an immediate revert without
a build, point the service back at a prior revision directly:

```bash
aws ecs update-service --cluster chardb-prod-cluster \
  --service chardb-prod-service --task-definition chardb-prod-task:<n>
```

Migrations do not roll back.

## 🏗️ Phase 2: Application Build and Deployment

### Step 5: **Full-Stack Deployment (Recommended)**

```bash
# Return to project root
cd ../../../

# Deploy both backend and frontend in one command
./deploy-fullstack.sh $ENVIRONMENT

# This script will:
# 1. Build and push backend Docker image to ECR
# 2. Deploy backend to EC2 with Docker Compose
# 3. Build frontend with correct backend API URL
# 4. Deploy frontend to S3 + CloudFront
# 5. Invalidate CloudFront cache
```

### Alternative: **Individual Component Deployment**

**Backend Only:**
```bash
# Build and push backend image to ECR
./scripts/build-and-push.sh $ENVIRONMENT latest

# Deploy backend to EC2
./deploy.sh $ENVIRONMENT latest
```

**Frontend Only:**
```bash
# Get backend URL for API configuration
export SERVER_IP=$(cd infra/environments/$ENVIRONMENT && terraform output -raw backend_public_ip)
export BACKEND_URL="http://$SERVER_IP:4000"

# Build frontend with backend API URL
./scripts/build-frontend.sh $ENVIRONMENT $BACKEND_URL

# Deploy frontend to S3 + CloudFront
./scripts/deploy-frontend.sh $ENVIRONMENT
```

**What Gets Deployed:**

**Backend Services:**
- ✅ Backend API (NestJS/GraphQL) on port 4000
- ✅ PostgreSQL database (containerized), bound to loopback -- reach it over an SSH tunnel

**Frontend Services:**
- ✅ React SPA hosted on CloudFront + S3
- ✅ Optimized caching (assets cached, HTML not cached)
- ✅ Global CDN distribution
- ✅ Automatic HTTPS termination

## 🗄️ Phase 3: Database Initialization

### Step 7: **Initialize Database Schema**

```bash
# Get server IP from Terraform
export SERVER_IP=$(cd infra/environments/$ENVIRONMENT && terraform output -raw backend_public_ip)
export SSH_KEY_PATH=$(cd infra/environments/$ENVIRONMENT && terraform output -raw backend_ssh_private_key | tee ~/.ssh/chardb-$ENVIRONMENT.pem && chmod 600 ~/.ssh/chardb-$ENVIRONMENT.pem && echo ~/.ssh/chardb-$ENVIRONMENT.pem)

# SSH into the server
ssh -i $SSH_KEY_PATH ec2-user@$SERVER_IP

# Inside the server, run database migrations
cd ~/app
docker compose exec backend yarn workspace @chardb/backend db:push

# Optional: Run database seed data (if available)
docker compose exec backend yarn workspace @chardb/backend db:seed

# Exit SSH session
exit
```

## ✅ Phase 4: Verification and Testing

### Step 8: **Verify Deployment**

**Backend Services:**
```bash
# Get backend URL
export SERVER_IP=$(cd infra/environments/$ENVIRONMENT && terraform output -raw backend_public_ip)

# Check application health
curl http://$SERVER_IP:4000/health

# Expected response: {"status":"ok","timestamp":"..."}

# Test GraphQL endpoint
curl -X POST http://$SERVER_IP:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}'

# Check service status on server
ssh -i $SSH_KEY_PATH ec2-user@$SERVER_IP "cd ~/app && docker compose ps"
```

**Frontend Services:**
```bash
# Get frontend URL
export FRONTEND_URL=$(cd infra/environments/$ENVIRONMENT && terraform output -raw frontend_website_url)

# Access frontend in browser
echo "Frontend: $FRONTEND_URL"

# Check CloudFront distribution status
aws cloudfront get-distribution --id $(cd infra/environments/$ENVIRONMENT && terraform output -raw frontend_cloudfront_distribution_id) --query 'Distribution.Status'

# Test frontend loads correctly
curl -I $FRONTEND_URL
# Should return 200 OK with CloudFront headers
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
chmod 600 ~/.ssh/chardb-$ENVIRONMENT.pem

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
ssh -i $SSH_KEY_PATH ec2-user@$SERVER_IP "cd ~/app && docker compose exec backend yarn workspace @chardb/backend db:push"
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

**Backend Costs:**
- EC2 t4g.micro: ~$6-8/month
- Elastic IP: ~$3.60/month (when not attached to running instance)
- ECR storage: ~$0.10/GB/month

**Frontend Costs:**
- S3 storage: ~$0.02/GB/month (minimal for static files)
- CloudFront: ~$0.085/GB for first 10TB + $0.0075 per 10,000 requests
- Route53 (if using custom domain): ~$0.50/month per hosted zone

**Total: ~$12-20/month** for basic usage with both backend and frontend

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
- **Distributed Tracing**: local development only (`docker/compose.yaml`); the staging host runs no collector
- **Health Endpoint**: `http://$SERVER_IP:4000/health`
- **GraphQL Playground**: `http://$SERVER_IP:4000/graphql` (development mode)

This completes the full deployment workflow for CharDB infrastructure and application. The setup provides a production-ready environment with proper security, observability, and scalability foundations.