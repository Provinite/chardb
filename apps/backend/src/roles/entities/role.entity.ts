import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType({ description: 'A role within a community that defines permissions for members' })
export class Role {
  @Field(() => ID, { description: 'Unique identifier for the role' })
  id!: string;

  /** The name of the role */
  @Field(() => String, { description: 'The name of the role' })
  name!: string;

  /** The community this role belongs to */
  @Field(() => ID, { description: 'The ID of the community this role belongs to' })
  communityId!: string;

  /** Permission to create new species */
  @Field(() => Boolean, { description: 'Whether members with this role can create new species' })
  canCreateSpecies!: boolean;

  /** Permission to create new characters */
  @Field(() => Boolean, { description: 'Whether members with this role can create new characters' })
  canCreateCharacter!: boolean;

  /** Permission to edit characters */
  @Field(() => Boolean, { description: 'Whether members with this role can edit characters' })
  canEditCharacter!: boolean;

  /** Permission to edit species */
  @Field(() => Boolean, { description: 'Whether members with this role can edit species' })
  canEditSpecies!: boolean;

  /** Permission to create invite codes */
  @Field(() => Boolean, { description: 'Whether members with this role can create invite codes' })
  canCreateInviteCode!: boolean;

  /** Permission to list invite codes */
  @Field(() => Boolean, { description: 'Whether members with this role can list invite codes' })
  canListInviteCodes!: boolean;

  /** Permission to create new roles */
  @Field(() => Boolean, { description: 'Whether members with this role can create new roles' })
  canCreateRole!: boolean;

  /** Permission to edit existing roles */
  @Field(() => Boolean, { description: 'Whether members with this role can edit existing roles' })
  canEditRole!: boolean;

  /** When the role was created */
  @Field(() => Date, { description: 'When the role was created' })
  createdAt!: Date;

  /** When the role was last updated */
  @Field(() => Date, { description: 'When the role was last updated' })
  updatedAt!: Date;

}

@ObjectType({ description: 'Paginated list of roles with connection metadata' })
export class RoleConnection {
  /** The roles in this page */
  @Field(() => [Role], { description: 'The roles in this page' })
  nodes!: Role[];

  /** Total count of roles matching the query */
  @Field(() => Number, { description: 'Total count of roles matching the query' })
  totalCount!: number;

  /** Whether there are more roles after this page */
  @Field(() => Boolean, { description: 'Whether there are more roles after this page' })
  hasNextPage!: boolean;

  /** Whether there are roles before this page */
  @Field(() => Boolean, { description: 'Whether there are roles before this page' })
  hasPreviousPage!: boolean;
}