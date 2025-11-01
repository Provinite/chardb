import { ObjectType, Field, ID } from '@nestjs/graphql';

/**
 * Information about a Discord guild (server)
 */
@ObjectType()
export class DiscordGuildInfo {
  /** Discord guild ID */
  @Field(() => ID, { description: 'Discord guild ID' })
  id: string;

  /** Discord guild name */
  @Field({ description: 'Discord guild name' })
  name: string;

  /** Whether the bot has access to this guild */
  @Field({ description: 'Whether the bot has access to this guild' })
  botHasAccess: boolean;
}
