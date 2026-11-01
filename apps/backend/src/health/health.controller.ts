import { Controller, Get } from "@nestjs/common";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";

@Controller("health")
export class HealthController {
  @Get()
  @AllowUnauthenticated()
  healthCheck() {
    return {
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
  }
}
