# OpenTelemetry Tracing Setup

This document describes the distributed tracing setup for debugging performance issues in CharDB.

## 🎯 Purpose

Added OpenTelemetry tracing to investigate slow CORS preflight OPTIONS requests (2000ms delays) and general performance monitoring.

## 🏗️ Architecture

```
Frontend → Backend → OTEL Collector → Jaeger
                  ↓
               Database/Redis
```

## 🚀 Quick Start

1. **Start the observability stack**:

   ```bash
   docker compose up jaeger otel-collector -d
   ```

2. **Install backend dependencies**:

   ```bash
   cd apps/backend
   yarn install
   ```

3. **Start the instrumented backend**:

   ```bash
   yarn workspace @chardb/backend dev
   ```

4. **Access Jaeger UI**:
   - Open http://localhost:16686
   - Select "chardb-backend" service
   - View traces and performance metrics

## 📊 Available Endpoints

### Jaeger UI

- **URL**: http://localhost:16686
- **Purpose**: View traces, analyze performance, find bottlenecks

### Health Check

- **URL**: http://localhost:4000/health
- **Purpose**: Verify backend and tracing status

### OTEL Collector Metrics

- **URL**: http://localhost:8889/metrics
- **Purpose**: Prometheus metrics from the collector

## 🔍 Debugging CORS Issues

### Target Problem

- OPTIONS requests taking 2000ms
- Need to identify bottleneck location

### Tracing Coverage

- ✅ HTTP request/response timing
- ✅ Express middleware execution
- ✅ GraphQL operation timing (per-field timing with `DEBUG_TRACE_LEVEL=full`)
- ✅ Database query timing
- ✅ Custom CORS preflight tracking
- ✅ Slow request detection (>1000ms warnings)

### Key Traces to Look For

1. **HTTP Traces**: Look for `OPTIONS /graphql` spans
2. **Middleware Traces**: Check NestJS middleware execution
3. **Database Traces**: Prisma client connection/query timing
4. **Custom Events**: CORS preflight start/complete events

## 📈 Instrumentation Details

### Auto-Instrumentations

- **HTTP**: Request/response timing with headers
- **Express**: Middleware execution timing
- **GraphQL**: Parse, validate and execute timing per operation. A span per resolved field only with `DEBUG_TRACE_LEVEL=full`.
- **Prisma**: Each operation and the SQL it ran
- **DataLoader**: Only with `DEBUG_TRACE_LEVEL=full`
- **NestJS Core**: Controller and guard timing

### Trace Detail

`DEBUG_TRACE_LEVEL` sets how much is recorded:

- **`standard`** (default): requests, GraphQL operations, Prisma operations and SQL.
- **`full`**: also a span per resolved GraphQL field and per DataLoader load and batch. For finding a slow field or which fields shared a batch. Costs about a third more CPU per list request, so turn it on for a debugging session rather than leaving it on in prod.

### Custom Spans

- **CORS Preflight**: Special tracking for OPTIONS requests
- **Slow Request Detection**: Automatic warnings for >1000ms requests
- **Request Metadata**: Origin, user-agent, content-length tracking

### Environment Variables

```bash
OTEL_SERVICE_NAME="chardb-backend"
OTEL_SERVICE_VERSION="1.0.0"
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
OTEL_TRACES_EXPORTER="otlp"
OTEL_METRICS_EXPORTER="otlp"
OTEL_LOG_LEVEL="info"
# DEBUG_TRACE_LEVEL="full"   # field and DataLoader spans; unset is "standard"
```

## 🐛 Troubleshooting

### No Traces Appearing

1. Check backend logs for tracing initialization messages
2. Verify OTEL collector is running: `docker ps`
3. Check collector logs: `docker logs chardb-otel-collector`
4. Verify Jaeger is accessible: http://localhost:16686

### Performance Analysis Steps

1. Make a slow OPTIONS request to trigger the issue
2. Go to Jaeger UI → Find Traces
3. Filter by service "chardb-backend" and operation "OPTIONS /graphql"
4. Look for traces with >2000ms duration
5. Drill down into spans to find the bottleneck
6. Check for database connection delays, middleware overhead, or authentication issues

### Expected Trace Structure

```
HTTP OPTIONS /graphql (2000ms)
├── cors_preflight_start (event)
├── Express Middleware Chain
│   ├── TracingMiddleware
│   ├── CORS Handler
│   └── ValidationPipe
├── NestJS Request Processing
├── Database Connection (if applicable)
└── cors_preflight_complete (event)
```

## 🔧 Configuration

### Collector Configuration

Located in `docker/otel-collector-config.yml`:

- Receives traces on ports 4317 (gRPC) and 4318 (HTTP)
- Exports to Jaeger on port 14250
- Exports metrics to Prometheus on port 8889

### Custom Middleware

`src/middleware/tracing.middleware.ts`:

- Tracks all HTTP requests with timing
- Special CORS preflight detection
- Automatic slow request warnings
- Rich request metadata collection

## 💡 Next Steps

After identifying the bottleneck:

1. **Database Issues**: Add connection pooling, optimize queries
2. **Middleware Issues**: Optimize or remove problematic middleware
3. **CORS Issues**: Configure proper caching headers
4. **Authentication Issues**: Optimize JWT validation

The tracing data will provide precise timing information to guide optimization efforts.
