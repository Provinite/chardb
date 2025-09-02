import { ObjectType, Field, ID } from "@nestjs/graphql";
import { User } from "../../users/entities/user.entity";
import { Role } from "../../roles/entities/role.entity";

@ObjectType({
  description: "A membership record linking a user to a community role",
})
export class CommunityMember {
  @Field(() => ID, {
    description: "Unique identifier for the community member record",
  })
  id!: string;

  /** The role this member has */
  @Field(() => ID, { description: "The ID of the role this member has" })
  roleId!: string;

  /** The user who is the member */
  @Field(() => ID, { description: "The ID of the user who is the member" })
  userId!: string;

  /** When the membership was created */
  @Field(() => Date, { description: "When the membership was created" })
  createdAt!: Date;

  /** When the membership was last updated */
  @Field(() => Date, { description: "When the membership was last updated" })
  updatedAt!: Date;
}

@ObjectType({
  description: "Paginated list of community members with connection metadata",
})
export class CommunityMemberConnection {
  /** The community members in this page */
  @Field(() => [CommunityMember], {
    description: "The community members in this page",
  })
  nodes!: CommunityMember[];

  /** Total count of community members matching the query */
  @Field(() => Number, {
    description: "Total count of community members matching the query",
  })
  totalCount!: number;

  /** Whether there are more community members after this page */
  @Field(() => Boolean, {
    description: "Whether there are more community members after this page",
  })
  hasNextPage!: boolean;

  /** Whether there are community members before this page */
  @Field(() => Boolean, {
    description: "Whether there are community members before this page",
  })
  hasPreviousPage!: boolean;
}