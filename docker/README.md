# Docker Compose Configuration

This directory contains a modular Docker Compose setup for the ThClone application.

## Structure

```
docker/
├── services/                    # Individual service definitions
│   ├── postgres.yml            # PostgreSQL database
│   ├── redis.yml               # Redis cache
│   ├── backend.yml             # Backend API service
│   ├── frontend.yml            # Frontend React app
│   ├── jaeger.yml              # Jaeger tracing UI
│   └── otel-collector.yml      # OpenTelemetry collector
├── docker compose.yml          # Development environment (uses include)
├── docker compose.prod.yml     # Production environment (uses include)
└── otel-collector-config.yml   # OTEL collector configuration
```

## Usage

### Development (Default)
```bash
# Local development with hot-reloading
docker compose up

# Run specific services only
docker compose up postgres redis backend
```

### Production
```bash
# Production deployment (requires Docker Compose 2.20+ for include)
docker compose -f docker compose.prod.yml up

# With environment variables
ECR_REPOSITORY_URL=123456789.dkr.ecr.us-east-1.amazonaws.com/thclone-backend \
DATABASE_URL=postgresql://user:pass@localhost:5432/thclone \
JWT_SECRET=your-secret \
docker compose -f docker compose.prod.yml up
```

### Testing
```bash
# Individual services for testing
docker compose -f services/postgres.yml -f services/redis.yml up

# Quick database for tests
docker compose -f services/postgres.yml up
```

## Service Definitions

Each service in the `services/` directory contains:
- Base configuration with environment variable defaults
- Health checks
- Volume definitions
- Network configuration

### Individual Service Usage

You can run individual services by referencing their files:

```bash
# Run just the database
docker compose -f services/postgres.yml up

# Run database + redis
docker compose -f services/postgres.yml -f services/redis.yml up
```

## Environment Variables

All services support environment variable customization:

### Database (postgres)
- `POSTGRES_DB` - Database name (default: thclone_dev)
- `POSTGRES_USER` - Database user (default: thclone)
- `POSTGRES_PASSWORD` - Database password (default: thclone_password)
- `POSTGRES_PORT` - External port (default: 5433)

### Backend
- `NODE_ENV` - Environment (development/production/test)
- `BACKEND_PORT` - API port (default: 4000)
- `DATABASE_URL` - Full database connection string
- `JWT_SECRET` - JWT signing secret
- `REDIS_URL` - Redis connection string

### Frontend
- `FRONTEND_PORT` - External port (default: 3000)
- `VITE_GRAPHQL_URL` - GraphQL endpoint URL

### Observability
- `JAEGER_UI_PORT` - Jaeger UI port (default: 16686)
- `OTEL_GRPC_PORT` - OTEL gRPC port (default: 4317)
- `OTEL_HTTP_PORT` - OTEL HTTP port (default: 4318)

## Benefits of This Structure

1. **Modularity**: Each service is self-contained
2. **Reusability**: Services can be mixed and matched
3. **Environment-specific**: Clear separation of concerns
4. **Maintainability**: Changes to one service don't affect others
5. **Terraform Integration**: Easy to template for infrastructure
6. **IDE Support**: JSON Schema validation and auto-completion in all files
7. **Modern Compose**: Uses `include` for cleaner composition (Docker Compose 2.20+)

## Terraform Integration

The modular structure works well with Terraform templating:

```hcl
# Reference the base file and customize with variables
docker_compose_content = templatefile("docker/docker compose.base.yml", {
  ecr_repository_url = var.ecr_repository_url
  database_url      = var.database_url
  # ... other variables
})
```

## Requirements

- **Docker Compose 2.20+** for `include` directive support
- **Fallback**: Individual service files can be used with older versions

## IDE Support

All Docker Compose files include JSON Schema references for better IDE support:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/compose-spec/compose-spec/master/schema/compose-spec.json
```

This provides:
- **Syntax validation**: Real-time validation of Docker Compose syntax
- **Auto-completion**: IntelliSense for service properties and values
- **Documentation**: Hover hints for properties and options
- **Error detection**: Immediate feedback on configuration issues

Compatible with VS Code, IntelliJ, and other editors with YAML Language Server support.