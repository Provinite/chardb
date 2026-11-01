import { ObjectType, Field, ID } from "@nestjs/graphql";
import { User } from "../../users/entities/user.entity";
import { Character } from "../../characters/entities/character.entity";

@ObjectType({
  description:
    "A record of a character changing hands: created for a user, moved between users, or given to its community",
})
export class CharacterOwnershipChange {
  @Field(() => ID, {
    description: "Unique identifier for the ownership change record",
  })
  id!: string;

  /** The character whose ownership was changed */
  @Field(() => ID, {
    description: "The ID of the character whose ownership was changed",
  })
  characterId!: string;

  /** The previous owner (null for initial character creation) */
  @Field(() => ID, {
    description:
      "The ID of the previous owner (null for initial character creation)",
    nullable: true,
  })
  fromUserId?: string | null;

  /** The new owner (null when the character was given to its community) */
  @Field(() => ID, {
    description:
      "The ID of the new owner (null when the character was given to its community)",
    nullable: true,
  })
  toUserId?: string | null;

  /** When the ownership change occurred */
  @Field(() => Date, { description: "When the ownership change occurred" })
  createdAt!: Date;

  // Relations - handled by field resolvers
  @Field(() => Character, {
    description: "The character whose ownership was changed",
  })
  character?: Character;

  @Field(() => User, { description: "The previous owner", nullable: true })
  fromUser?: User | null;

  @Field(() => User, { description: "The new owner", nullable: true })
  toUser?: User | null;
}

@ObjectType({
  description:
    "Paginated list of character ownership changes with connection metadata",
})
export class CharacterOwnershipChangeConnection {
  /** The character ownership changes in this page */
  @Field(() => [CharacterOwnershipChange], {
    description: "The character ownership changes in this page",
  })
  nodes!: CharacterOwnershipChange[];

  /** Total count of character ownership changes matching the query */
  @Field(() => Number, {
    description:
      "Total count of character ownership changes matching the query",
  })
  totalCount!: number;

  /** Whether there are more character ownership changes after this page */
  @Field(() => Boolean, {
    description:
      "Whether there are more character ownership changes after this page",
  })
  hasNextPage!: boolean;

  /** Whether there are character ownership changes before this page */
  @Field(() => Boolean, {
    description:
      "Whether there are character ownership changes before this page",
  })
  hasPreviousPage!: boolean;
}
