import { ObjectType, Field, ID } from '@nestjs/graphql';

/**
 * Discord User Information DTO
 *
 * Contains publicly available information about a Discord user.
 * Used for username resolution and validation when creating
 * orphaned characters with pending ownership.
 */
@ObjectType({
  description: 'Resolved Discord user information',
})
export class DiscordUserInfo {
  @Field(() => ID, {
    description: 'Discord user ID (snowflake)',
  })
  userId: string;

  @Field({
    description: 'Discord username',
  })
  username: string;

  @Field({
    nullable: true,
    description: 'Discord display name (may differ from username)',
  })
  displayName?: string;

  @Field({
    nullable: true,
    description: 'URL to user avatar image',
  })
  avatarUrl?: string;
}
