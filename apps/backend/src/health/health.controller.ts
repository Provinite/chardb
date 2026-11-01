import { Controller, Get } from "@nestjs/common";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";

@Controller("health")
export class HealthController {
  @Get()
  @AllowUnauthenticated()
  healthCheck() {
    return {
      status: "ok",
      version: process.env.OTEL_SERVICE_VERSION || "1.0.0",
    };
  }
}
