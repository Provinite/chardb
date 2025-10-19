import {
  CreateCommunityMemberInput,
  UpdateCommunityMemberInput,
} from '../dto/community-member.dto';
import {
  CommunityMember,
  CommunityMemberConnection,
} from '../entities/community-member.entity';
import {
  CreateCommunityMemberServiceInput,
  UpdateCommunityMemberServiceInput,
} from '../community-members.service';
import { Prisma } from '@chardb/database';

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Maps CreateCommunityMemberInput to service input format
 */
export function mapCreateCommunityMemberInputToService(
  input: CreateCommunityMemberInput,
): CreateCommunityMemberServiceInput {
  return {
    userId: input.userId,
    roleId: input.roleId,
  };
}

/**
 * Maps UpdateCommunityMemberInput to service input format
 */
export function mapUpdateCommunityMemberInputToService(
  input: UpdateCommunityMemberInput,
): UpdateCommunityMemberServiceInput {
  const result: UpdateCommunityMemberServiceInput = {};

  if (input.roleId !== undefined) result.roleId = input.roleId;

  return result;
}

// eslint-disable-next-line @typescript-eslint/ban-types
type PrismaCommunityMember = Prisma.CommunityMemberGetPayload<{}>;

/**
 * Maps Prisma CommunityMember result to GraphQL CommunityMember entity
 * Only includes scalar fields - relations handled by field resolvers
 */
export function mapPrismaCommunityMemberToGraphQL(
  prismaCommunityMember: PrismaCommunityMember,
): CommunityMember {
  return {
    id: prismaCommunityMember.id,
    userId: prismaCommunityMember.userId,
    roleId: prismaCommunityMember.roleId,
    createdAt: prismaCommunityMember.createdAt,
    updatedAt: prismaCommunityMember.updatedAt,
  };
}

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaCommunityMemberConnectionToGraphQL(serviceResult: {
  nodes: PrismaCommunityMember[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}): CommunityMemberConnection {
  return {
    nodes: serviceResult.nodes.map(mapPrismaCommunityMemberToGraphQL),
    totalCount: serviceResult.totalCount,
    hasNextPage: serviceResult.hasNextPage,
    hasPreviousPage: serviceResult.hasPreviousPage,
  };
}
