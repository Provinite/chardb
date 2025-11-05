import { Controller, Get } from "@nestjs/common";
import { trace } from "@opentelemetry/api";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";

@Controller("health")
export class HealthController {
  private readonly tracer = trace.getTracer("health-controller", "1.0.0");

  @Get()
  @AllowUnauthenticated()
  healthCheck() {
    const span = this.tracer.startSpan("health_check");

    try {
      const health = {
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "chardb-backend",
        version: process.env.OTEL_SERVICE_VERSION || "1.0.0",
        tracing: {
          enabled: true,
          endpoint:
            process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318",
        },
      };

      span.setAttributes({
        "health.status": "ok",
        "health.check_duration_ms": Date.now(),
      });

      span.end();
      return health;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      span.end();
      throw error;
    }
  }
}
