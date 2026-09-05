// Import tracing FIRST before any other imports
import "./tracing";

import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { CustomThrottlerGuard } from "./middleware/custom-throttler.guard";
import { OptionalJwtAuthGuard } from "./auth/guards/optional-jwt-auth.guard";
import { WinstonModule } from "nest-winston";
import { loggerConfig } from "./logger.config";
// Namespace import: this tsconfig has `allowSyntheticDefaultImports` without
// `esModuleInterop`, so a default import type-checks and then emits
// `cookie_parser_1.default`, which is undefined at runtime for a CommonJS
// module whose export is the function itself.
import * as cookieParser from "cookie-parser";
import { isOriginAllowed } from "./auth/allowed-origins";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(loggerConfig),
  });

  // Enable request logging middleware
  app.use((req: any, res: any, next: any) => {
    const logger = new Logger("HTTP");
    const start = Date.now();

    logger.log(`${req.method} ${req.url} - ${req.ip}`);

    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.log(
        `${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`,
      );
    });

    next();
  });

  // Tracing is handled by OpenTelemetry auto-instrumentation

  // Parse cookies before anything reads the refresh cookie off a request.
  app.use(cookieParser());

  // Enable CORS with optimizations
  app.enableCors({
    // An allowlist rather than a reflector, because `credentials: true` now
    // means a real session cookie. See `auth/allowed-origins.ts`.
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // No Origin header at all: same-origin navigations, curl, health checks.
      // Nothing to allow or deny, and no cookie risk -- CSRF needs a page.
      if (!origin) return callback(null, true);
      return callback(null, isOriginAllowed(origin));
    },
    credentials: true,
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    maxAge: 86400, // Cache preflight response for 24 hours
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "apollo-require-preflight",
    ],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter for detailed error logging
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global guards (order matters!)
  app.useGlobalGuards(
    app.get(CustomThrottlerGuard), // Rate limiting
    app.get(OptionalJwtAuthGuard), // Populate req.user if JWT present
    app.get("PERMISSION_OR_GUARD"), // Permission checks
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
}

bootstrap();
