// Import tracing FIRST before any other imports
import './tracing';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { CustomThrottlerGuard } from './middleware/custom-throttler.guard';
import { OptionalJwtAuthGuard } from './auth/guards/optional-jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Enable request logging middleware
  app.use((req: any, res: any, next: any) => {
    const logger = new Logger('HTTP');
    const start = Date.now();

    logger.log(`${req.method} ${req.url} - ${req.ip}`);

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.log(
        `${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`,
      );
    });

    next();
  });

  // Tracing is handled by OpenTelemetry auto-instrumentation

  // Enable CORS with optimizations
  app.enableCors({
    origin: true, // Allow all origins for now
    credentials: true,
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    maxAge: 86400, // Cache preflight response for 24 hours
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'apollo-require-preflight',
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
    app.get('PERMISSION_OR_GUARD'), // Permission checks
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
}

bootstrap();
