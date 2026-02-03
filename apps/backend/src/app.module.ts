import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { Logger } from "@nestjs/common";
import { join } from "path";

import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CharactersModule } from "./characters/characters.module";
import { ImagesModule } from "./images/images.module";
import { MediaModule } from "./media/media.module";
import { GalleriesModule } from "./galleries/galleries.module";
import { CommentsModule } from "./comments/comments.module";
import { SocialModule } from "./social/social.module";
import { HealthModule } from "./health/health.module";
import { TagsModule } from "./tags/tags.module";
import { CommunitiesModule } from "./communities/communities.module";
import { SpeciesModule } from "./species/species.module";
import { TraitsModule } from "./traits/traits.module";
import { EnumValuesModule } from "./enum-values/enum-values.module";
import { SpeciesVariantsModule } from "./species-variants/species-variants.module";
import { TraitListEntriesModule } from "./trait-list-entries/trait-list-entries.module";
import { EnumValueSettingsModule } from "./enum-value-settings/enum-value-settings.module";
import { RolesModule } from "./roles/roles.module";
import { CommunityMembersModule } from "./community-members/community-members.module";
import { CommunityInvitationsModule } from "./community-invitations/community-invitations.module";
import { InviteCodesModule } from "./invite-codes/invite-codes.module";
import { CharacterOwnershipChangesModule } from "./character-ownership-changes/character-ownership-changes.module";
import { ExternalAccountsModule } from "./external-accounts/external-accounts.module";
import { ItemsModule } from "./items/items.module";
import { CommunityColorsModule } from "./community-colors/community-colors.module";
import { PendingOwnershipModule } from "./pending-ownership/pending-ownership.module";
import { DiscordModule } from "./discord/discord.module";
import { QueueConsumerModule } from "./queue-consumer/queue-consumer.module";
import { ImageModerationModule } from "./image-moderation/image-moderation.module";
import { Request, Response } from "express";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000, // 1 second window
        limit: 20, // 20 requests per second (more reasonable for dev)
      },
      {
        name: "long",
        ttl: 60000, // 1 minute window
        limit: 200, // 200 requests per minute (increased for Vite)
      },
    ]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), "src/schema.gql"),
      sortSchema: true,
      graphiql: process.env.GRAPHQL_PLAYGROUND === "true",
      introspection: process.env.GRAPHQL_INTROSPECTION === "true",
      fieldResolverEnhancers: ["guards", "interceptors", "filters"],
      context: ({ req, res }: { req: Request; res: Response }) => ({
        req,
        res,
      }),
      csrfPrevention: process.env.GRAPHQL_CSRF_PREVENTION === "true",
      plugins: [
        {
          async requestDidStart() {
            const logger = new Logger("GraphQL");

            return {
              async didResolveOperation(requestContext: any) {
                const { request, operationName } = requestContext;
                const operationType =
                  request.query?.match(
                    /^\s*(query|mutation|subscription)/i,
                  )?.[1] || "unknown";

                // Filter sensitive data from variables
                const sanitizedVariables = this.sanitizeVariables(
                  request.variables,
                );
                const variables = sanitizedVariables
                  ? JSON.stringify(sanitizedVariables)
                  : "{}";

                logger.log(
                  `${operationType}: ${operationName || "unnamed"} - Variables: ${variables}`,
                );
              },

              // Helper method to remove sensitive data from logs
              sanitizeVariables(variables: any): any {
                if (!variables) return variables;

                const sensitiveFields = [
                  "password",
                  "oldPassword",
                  "newPassword",
                  "token",
                  "refreshToken",
                ];
                const sanitized = { ...variables };

                for (const field of sensitiveFields) {
                  if (sanitized[field]) {
                    sanitized[field] = "[REDACTED]";
                  }
                }

                return sanitized;
              },

              async willSendResponse(requestContext: any) {
                const { request, response, operationName } = requestContext;
                const operationType =
                  request.query?.match(
                    /^\s*(query|mutation|subscription)/i,
                  )?.[1] || "unknown";
                const hasErrors = response.errors && response.errors.length > 0;

                if (hasErrors) {
                  logger.error(
                    `${operationType}: ${operationName || "unnamed"} - Errors: ${JSON.stringify(response.errors)}`,
                  );
                } else {
                  logger.log(
                    `${operationType}: ${operationName || "unnamed"} - Success`,
                  );
                }
              },

              async didEncounterErrors(requestContext: any) {
                const { request, errors, operationName } = requestContext;
                const operationType =
                  request.query?.match(
                    /^\s*(query|mutation|subscription)/i,
                  )?.[1] || "unknown";

                // Filter sensitive data from variables
                const sanitizedVariables = this.sanitizeVariables(
                  request.variables,
                );
                const variables = sanitizedVariables
                  ? JSON.stringify(sanitizedVariables)
                  : "{}";

                // Log detailed error information
                logger.error(
                  `${operationType}: ${operationName || "unnamed"} - Execution Errors:`,
                );
                logger.error(`Variables: ${variables}`);
                logger.error(`Query: ${request.query}`);

                errors.forEach((error: any, index: number) => {
                  logger.error(`Error ${index + 1}:`);
                  logger.error(`  Message: ${error.message}`);
                  logger.error(
                    `  Path: ${error.path ? error.path.join(" -> ") : "N/A"}`,
                  );
                  logger.error(
                    `  Locations: ${error.locations ? JSON.stringify(error.locations) : "N/A"}`,
                  );

                  // Include stack trace if available
                  if (error.originalError?.stack) {
                    logger.error(`  Stack Trace:`);
                    logger.error(`${error.originalError.stack}`);
                  } else if (error.stack) {
                    logger.error(`  Stack Trace:`);
                    logger.error(`${error.stack}`);
                  }

                  // Include any extensions
                  if (error.extensions) {
                    logger.error(
                      `  Extensions: ${JSON.stringify(error.extensions)}`,
                    );
                  }
                });
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
    MediaModule,
    GalleriesModule,
    CommentsModule,
    SocialModule,
    HealthModule,
    TagsModule,
    CommunitiesModule,
    SpeciesModule,
    TraitsModule,
    EnumValuesModule,
    SpeciesVariantsModule,
    TraitListEntriesModule,
    EnumValueSettingsModule,
    RolesModule,
    CommunityMembersModule,
    CommunityInvitationsModule,
    InviteCodesModule,
    CharacterOwnershipChangesModule,
    ExternalAccountsModule,
    ItemsModule,
    CommunityColorsModule,
    PendingOwnershipModule,
    DiscordModule,
    QueueConsumerModule,
    ImageModerationModule,
  ],
})
export class AppModule {}
