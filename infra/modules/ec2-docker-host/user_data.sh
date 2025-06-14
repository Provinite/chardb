#!/bin/bash

# System setup and global dependencies only
# Application deployment should be handled separately

# Update system
yum update -y

# Install Docker
yum install -y docker git curl unzip
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Install AWS CLI v2
yum remove awscli -y
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
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
