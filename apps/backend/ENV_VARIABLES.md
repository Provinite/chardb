# Environment Variables Documentation

This document provides a comprehensive list of all environment variables used in the ThClone backend application.

## Table of Contents
- [Database Configuration](#database-configuration)
- [JWT Authentication](#jwt-authentication)
- [Server Configuration](#server-configuration)
- [CORS Configuration](#cors-configuration)
- [OpenTelemetry Tracing](#opentelemetry-tracing)
- [Rate Limiting](#rate-limiting)
- [Environment-Specific Variables](#environment-specific-variables)

## Database Configuration

### `DATABASE_URL`
- **Type**: String (PostgreSQL connection string)
- **Required**: Yes
- **Description**: PostgreSQL database connection URL
- **Referenced in**: 
  - `prisma/schema.prisma` (line 7)
  - `test/setup-e2e.ts` (line 59)
- **Example Values**:
  - Development: `"postgresql://thclone:thclone_password@localhost:5433/thclone_dev"`
  - Production: `"postgresql://username:password@localhost:5432/thclone_db"`
  - Test: `"postgresql://test_user:test_password@localhost:5440/thclone_test"`

## JWT Authentication

### `JWT_SECRET`
- **Type**: String
- **Required**: Yes
- **Description**: Secret key used for signing JWT tokens
- **Referenced in**: 
  - `src/auth/strategies/jwt.strategy.ts` (line 16)
  - `src/auth/auth.module.ts` (line 18)
  - `test/setup-e2e.ts` (line 136)
- **Example Values**:
  - Development: `"development-jwt-secret-key-change-in-production"`
  - Production: `"your-super-secret-jwt-key-here"`
  - Test: `"test-jwt-secret-key-for-testing-only"`

### `JWT_REFRESH_SECRET`
- **Type**: String
- **Required**: No (only used in tests)
- **Description**: Secret key for refresh token validation
- **Referenced in**: Test environment only
- **Example**: `"test-refresh-secret-key-for-testing-only"`

### `JWT_EXPIRES_IN`
- **Type**: String
- **Required**: No (only used in tests)
- **Description**: JWT token expiration time
- **Default**: `"15m"` (hardcoded in auth module)
- **Example**: `"15m"`

### `JWT_REFRESH_EXPIRES_IN`
- **Type**: String
- **Required**: No (only used in tests)
- **Description**: JWT refresh token expiration time
- **Default**: `"7d"` (hardcoded in auth service)
- **Example**: `"7d"`

## Server Configuration

### `PORT`
- **Type**: Number
- **Required**: No
- **Description**: Port number for the server to listen on
- **Referenced in**: `src/main.ts` (line 51)
- **Default**: `4000`
- **Example**: `4000`

### `NODE_ENV`
- **Type**: String
- **Required**: No
- **Description**: Node.js environment mode
- **Referenced in**: 
  - `src/main.ts` (line 22)
  - `src/app.module.ts` (lines 41, 42)
  - `src/middleware/custom-throttler.guard.ts` (line 34)
- **Default**: `"development"`
- **Valid Values**: `"development"`, `"production"`, `"test"`

## CORS Configuration

### `FRONTEND_URL`
- **Type**: String
- **Required**: No
- **Description**: Frontend application URL for CORS configuration
- **Referenced in**: `src/main.ts` (lines 23, 28)
- **Example Values**:
  - Development: `"http://localhost:5173"` (Vite default)
  - Production: `"http://localhost:3000"`
- **Note**: In development, multiple origins are allowed including localhost:3000, localhost:5173, and localhost:8080

### `CORS_ORIGIN`
- **Type**: String
- **Required**: No (only used in tests)
- **Description**: CORS origin configuration for test environment
- **Example**: `"http://localhost:3000"`



## OpenTelemetry Tracing

### `OTEL_SERVICE_NAME`
- **Type**: String
- **Required**: No
- **Description**: Service name for OpenTelemetry tracing
- **Referenced in**: 
  - `src/tracing.ts` (line 13)
- **Default**: `"thclone-backend"`
- **Example**: `"thclone-backend"`

### `OTEL_SERVICE_VERSION`
- **Type**: String
- **Required**: No
- **Description**: Service version for OpenTelemetry tracing
- **Referenced in**: 
  - `src/tracing.ts` (line 14)
  - `src/health/health.controller.ts` (line 17)
- **Default**: `"1.0.0"`
- **Example**: `"1.0.0"`

### `OTEL_EXPORTER_OTLP_ENDPOINT`
- **Type**: String (URL)
- **Required**: No
- **Description**: OpenTelemetry collector endpoint URL
- **Referenced in**: 
  - `src/tracing.ts` (lines 20, 75)
  - `src/health/health.controller.ts` (line 20)
- **Default**: `"http://localhost:4318"`
- **Example**: `"http://localhost:4318"`

### `OTEL_EXPORTER_OTLP_PROTOCOL`
- **Type**: String
- **Required**: No
- **Description**: OpenTelemetry export protocol
- **Referenced in**: Configuration files only
- **Default**: `"http/protobuf"`
- **Example**: `"http/protobuf"`

### `OTEL_TRACES_EXPORTER`
- **Type**: String
- **Required**: No
- **Description**: OpenTelemetry traces exporter type
- **Referenced in**: Configuration files only
- **Default**: `"otlp"`
- **Example**: `"otlp"`

### `OTEL_METRICS_EXPORTER`
- **Type**: String
- **Required**: No
- **Description**: OpenTelemetry metrics exporter type
- **Referenced in**: Configuration files only
- **Default**: `"otlp"`
- **Example**: `"otlp"`

### `OTEL_LOG_LEVEL`
- **Type**: String
- **Required**: No
- **Description**: OpenTelemetry logging level
- **Referenced in**: Configuration files only
- **Default**: `"info"`
- **Valid Values**: `"error"`, `"warn"`, `"info"`, `"debug"`

## Rate Limiting

Rate limiting is implemented using NestJS ThrottlerModule with hardcoded values in `app.module.ts`:
- Short term: 20 requests per 1 second
- Long term: 200 requests per 1 minute

No environment variables are used for rate limiting configuration.

## Environment-Specific Variables

### Development Environment (.env)
```env
DATABASE_URL="postgresql://thclone:thclone_password@localhost:5433/thclone_dev"
JWT_SECRET="development-jwt-secret-key-change-in-production"
PORT=4000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

### Test Environment (.env.test)
```env
DATABASE_URL="postgresql://test_user:test_password@localhost:5440/thclone_test"
JWT_SECRET="test-jwt-secret-key-for-testing-only"
JWT_REFRESH_SECRET="test-refresh-secret-key-for-testing-only"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
NODE_ENV="test"
CORS_ORIGIN="http://localhost:3000"
```

### Production Environment (.env.example)
```env
DATABASE_URL="postgresql://username:password@localhost:5432/thclone_db"
JWT_SECRET="your-super-secret-jwt-key-here"
PORT=4000
NODE_ENV=production
FRONTEND_URL="http://localhost:3000"
OTEL_SERVICE_NAME="thclone-backend"
OTEL_SERVICE_VERSION="1.0.0"
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
OTEL_TRACES_EXPORTER="otlp"
OTEL_METRICS_EXPORTER="otlp"
OTEL_LOG_LEVEL="info"
```

## Notes

1. **Required vs Optional**: Variables marked as "Required: Yes" must be set for the application to function properly. Optional variables have sensible defaults or are only used in specific environments.

2. **Security**: Always use strong, unique values for `JWT_SECRET` in production environments. Never commit real secrets to version control.



5. **Tracing**: OpenTelemetry tracing is fully implemented and provides detailed application monitoring. Jaeger UI is available at http://localhost:16686 when tracing is enabled.

6. **Rate Limiting**: The application has built-in rate limiting with custom throttling guards. Rate limits are hardcoded in the application configuration and are not configurable via environment variables.

7. **CORS**: The application automatically allows multiple localhost origins in development mode for flexibility with different frontend development servers.