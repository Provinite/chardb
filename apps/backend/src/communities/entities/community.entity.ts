import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Community {
  /** Unique identifier for the community */
  @Field(() => ID, { description: 'Unique identifier for the community' })
  id: string;

  /** Name of the community (must be unique) */
  @Field({ description: 'Name of the community' })
  name: string;

  /** Discord guild (server) ID linked to this community */
  @Field(() => String, { nullable: true, description: 'Discord guild (server) ID linked to this community' })
  discordGuildId?: string | null;

  /** Discord guild (server) name for display */
  @Field(() => String, { nullable: true, description: 'Discord guild (server) name for display' })
  discordGuildName?: string | null;

  /** When the community was created */
  @Field({ description: 'When the community was created' })
  createdAt: Date;

  /** When the community was last updated */
  @Field({ description: 'When the community was last updated' })
  updatedAt: Date;
}

@ObjectType()
export class CommunityConnection {
  /** List of communities in this connection */
  @Field(() => [Community], { description: 'List of communities in this connection' })
  nodes: Community[];

  /** Total number of communities available */
  @Field({ description: 'Total number of communities available' })
  totalCount: number;

  /** Whether there are more communities after this page */
  @Field({ description: 'Whether there are more communities after this page' })
  hasNextPage: boolean;

  /** Whether there are more communities before this page */
  @Field({ description: 'Whether there are more communities before this page' })
  hasPreviousPage: boolean;
}