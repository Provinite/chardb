// Import tracing FIRST before any other imports
import './tracing';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { TracingMiddleware } from './middleware/tracing.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get the underlying Express instance
  const expressApp = app.getHttpAdapter().getInstance();
  
  // Add tracing middleware to Express BEFORE any NestJS middleware
  expressApp.use((req: any, res: any, next: any) => {
    new TracingMiddleware().use(req, res, next);
  });
  
  // Enable CORS with optimizations
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:8080',
          process.env.FRONTEND_URL
        ].filter(Boolean),
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
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  const port = process.env.PORT || 4000;
  await app.listen(port);
  
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
}

bootstrap();