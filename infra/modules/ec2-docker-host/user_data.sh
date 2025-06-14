#!/bin/bash

# Amazon Linux 2023 EC2 instance initialization script
# System setup and global dependencies only
# Application deployment should be handled separately

# Update system
dnf update -y

# Install basic dependencies
dnf install -y git curl unzip dnf-plugins-core

# Remove any existing Docker packages
dnf remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine

# Add Docker repository
dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker Engine and Compose plugin
dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Docker Compose is now installed as a plugin (docker-compose-plugin)
# Use 'docker compose' command (note: space, not hyphen)
# Verify installation
docker compose version

# Install AWS CLI v2
dnf remove awscli -y
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
elif [ "$ARCH" = "aarch64" ]; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"
else
    echo "Unsupported architecture: $ARCH"
    exit 1
fi
unzip awscliv2.zip
./aws/install
rm -rf awscliv2.zip aws

# Create deployment directory and set as working directory
mkdir -p /home/ec2-user/app
chown ec2-user:ec2-user /home/ec2-user/app
cd /home/ec2-user/app

# Create .env file with application secrets
cat > /home/ec2-user/app/.env << 'EOF'
DATABASE_URL=postgresql://${db_user}:${db_password}@postgres:5432/${db_name}
JWT_SECRET=${jwt_secret}
NODE_ENV=production
PORT=4000

# Postgres service variables
POSTGRES_DB=${db_name}
POSTGRES_USER=${db_user}
POSTGRES_PASSWORD=${db_password}
EOF

# Set proper permissions on .env file
chmod 600 /home/ec2-user/app/.env
chown ec2-user:ec2-user /home/ec2-user/app/.env
