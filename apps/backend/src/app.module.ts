import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { ThrottlerModule } from "@nestjs/throttler";
import { Logger } from "@nestjs/common";
import { join } from "path";
import type {
  BaseContext,
  GraphQLRequestContextDidEncounterErrors,
  GraphQLRequestContextDidResolveOperation,
  GraphQLRequestContextWillSendResponse,
} from "@apollo/server";

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
import { ItemTransactionsModule } from "./item-transactions/item-transactions.module";
import { CurrenciesModule } from "./currencies/currencies.module";
import { CommunityColorsModule } from "./community-colors/community-colors.module";
import { PendingOwnershipModule } from "./pending-ownership/pending-ownership.module";
import { DiscordModule } from "./discord/discord.module";
import { DeviantArtModule } from "./deviantart/deviantart.module";
import { QueueConsumerModule } from "./queue-consumer/queue-consumer.module";
import { ImageModerationModule } from "./image-moderation/image-moderation.module";
import { TraitReviewModule } from "./trait-review/trait-review.module";
import { DeviantartUuidBackfillModule } from "./jobs/deviantart-uuid-backfill/deviantart-uuid-backfill.module";
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
      subscriptions: {
        "graphql-ws": true,
      },
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
              async didResolveOperation(
                requestContext: GraphQLRequestContextDidResolveOperation<BaseContext>,
              ) {
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
              sanitizeVariables(
                variables: Record<string, unknown> | undefined,
              ): Record<string, unknown> | undefined {
                if (!variables) return variables;

                const sensitiveFields = new Set([
                  "password",
                  "oldPassword",
                  "newPassword",
                  "token",
                  "refreshToken",
                ]);

                const sanitize = (
                  obj: Record<string, unknown>,
                  depth: number,
                ): Record<string, unknown> => {
                  if (depth <= 0) return obj;
                  const result: Record<string, unknown> = {};
                  for (const [key, value] of Object.entries(obj)) {
                    if (sensitiveFields.has(key)) {
                      result[key] = "[REDACTED]";
                    } else if (
                      value &&
                      typeof value === "object" &&
                      !Array.isArray(value)
                    ) {
                      result[key] = sanitize(
                        value as Record<string, unknown>,
                        depth - 1,
                      );
                    } else {
                      result[key] = value;
                    }
                  }
                  return result;
                };

                return sanitize(variables, 5);
              },

              async willSendResponse(
                requestContext: GraphQLRequestContextWillSendResponse<BaseContext>,
              ) {
                const { request, response, operationName } = requestContext;
                const operationType =
                  request.query?.match(
                    /^\s*(query|mutation|subscription)/i,
                  )?.[1] || "unknown";
                // Apollo 4 moved errors under response.body; `response.errors`
                // has never existed here, so this branch was silently dead and
                // every failing operation logged as a success.
                const errors =
                  response.body.kind === "single"
                    ? response.body.singleResult.errors
                    : undefined;

                if (errors && errors.length > 0) {
                  logger.error(
                    `${operationType}: ${operationName || "unnamed"} - Errors: ${JSON.stringify(errors)}`,
                  );
                } else {
                  logger.log(
                    `${operationType}: ${operationName || "unnamed"} - Success`,
                  );
                }
              },

              async didEncounterErrors(
                requestContext: GraphQLRequestContextDidEncounterErrors<BaseContext>,
              ) {
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

                errors.forEach((error, index) => {
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
    ItemTransactionsModule,
    CurrenciesModule,
    CommunityColorsModule,
    PendingOwnershipModule,
    DiscordModule,
    DeviantArtModule,
    QueueConsumerModule,
    ImageModerationModule,
    TraitReviewModule,
    DeviantartUuidBackfillModule,
  ],
})
export class AppModule {}
