import {
  CreateCommunityInvitationInput,
  RespondToCommunityInvitationInput,
} from '../dto/community-invitation.dto';
import {
  CommunityInvitation,
  CommunityInvitationConnection,
} from '../entities/community-invitation.entity';
import { Prisma } from '@chardb/database';

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Maps CreateCommunityInvitationInput to service input format
 */
export function mapCreateCommunityInvitationInputToService(
  input: CreateCommunityInvitationInput,
) {
  return {
    roleId: input.roleId,
    inviteeId: input.inviteeId,
    inviterId: input.inviterId,
    communityId: input.communityId,
  };
}

/**
 * Maps RespondToCommunityInvitationInput to service input format
 */
export function mapRespondToCommunityInvitationInputToService(
  input: RespondToCommunityInvitationInput,
) {
  return {
    accept: input.accept,
  };
}

// Define the Prisma return type with all relations
type PrismaInvitationWithRelations = Prisma.CommunityInvitationGetPayload<{
  include: {
    role: { include: { community: true } };
    invitee: true;
    inviter: true;
    community: true;
  };
}>;

/**
 * Maps Prisma CommunityInvitation result to GraphQL CommunityInvitation entity
 * Only includes scalar fields - relations are handled by field resolvers
 */
export function mapPrismaCommunityInvitationToGraphQL(
  prismaInvitation: PrismaInvitationWithRelations,
): CommunityInvitation {
  return {
    id: prismaInvitation.id,
    roleId: prismaInvitation.roleId,
    inviteeId: prismaInvitation.inviteeId,
    inviterId: prismaInvitation.inviterId,
    communityId: prismaInvitation.communityId,
    acceptedAt: prismaInvitation.acceptedAt,
    declinedAt: prismaInvitation.declinedAt,
    createdAt: prismaInvitation.createdAt,
    // Computed properties and relations handled by field resolvers
  } as CommunityInvitation;
}

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaConnectionToGraphQL(serviceResult: {
  nodes: PrismaInvitationWithRelations[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}): CommunityInvitationConnection {
  return {
    nodes: serviceResult.nodes.map(mapPrismaCommunityInvitationToGraphQL),
    totalCount: serviceResult.totalCount,
    hasNextPage: serviceResult.hasNextPage,
    hasPreviousPage: serviceResult.hasPreviousPage,
  };
}
