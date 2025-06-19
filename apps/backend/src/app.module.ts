import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { join } from 'path';
import { CustomThrottlerGuard } from './middleware/custom-throttler.guard';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CharactersModule } from './characters/characters.module';
import { ImagesModule } from './images/images.module';
import { GalleriesModule } from './galleries/galleries.module';
import { CommentsModule } from './comments/comments.module';
import { SocialModule } from './social/social.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second window
        limit: 20, // 20 requests per second (more reasonable for dev)
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute window  
        limit: 200, // 200 requests per minute (increased for Vite)
      },
    ]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: process.env.GRAPHQL_PLAYGROUND === 'true',
      introspection: process.env.GRAPHQL_INTROSPECTION === 'true',
      context: ({ req, res }) => ({ req, res }),
      csrfPrevention: process.env.GRAPHQL_CSRF_PREVENTION === 'true',
      plugins: [
        {
          async requestDidStart() {
            const logger = new Logger('GraphQL');
            
            return {
              async didResolveOperation(requestContext: any) {
                const { request, operationName } = requestContext;
                const operationType = request.query?.match(/^\s*(query|mutation|subscription)/i)?.[1] || 'unknown';
                const variables = request.variables ? JSON.stringify(request.variables) : '{}';
                
                logger.log(`${operationType}: ${operationName || 'unnamed'} - Variables: ${variables}`);
              },
              
              async willSendResponse(requestContext: any) {
                const { request, response, operationName } = requestContext;
                const operationType = request.query?.match(/^\s*(query|mutation|subscription)/i)?.[1] || 'unknown';
                const hasErrors = response.errors && response.errors.length > 0;
                
                if (hasErrors) {
                  logger.error(`${operationType}: ${operationName || 'unnamed'} - Errors: ${JSON.stringify(response.errors)}`);
                } else {
                  logger.log(`${operationType}: ${operationName || 'unnamed'} - Success`);
                }
              },
              
              async didEncounterErrors(requestContext: any) {
                const { request, errors, operationName } = requestContext;
                const operationType = request.query?.match(/^\s*(query|mutation|subscription)/i)?.[1] || 'unknown';
                
                logger.error(`${operationType}: ${operationName || 'unnamed'} - Execution Errors: ${JSON.stringify(errors)}`);
              },
            };
          },
        },
      ],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    CharactersModule,
    ImagesModule,
    GalleriesModule,
    CommentsModule,
    SocialModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}