import {
  CreateInviteCodeInput,
  UpdateInviteCodeInput,
  ClaimInviteCodeInput,
} from '../dto/invite-code.dto';
import {
  InviteCode,
  InviteCodeConnection,
} from '../entities/invite-code.entity';
import { Prisma } from '@chardb/database';

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Maps CreateInviteCodeInput to service input format
 */
export function mapCreateInviteCodeInputToService(
  input: CreateInviteCodeInput,
) {
  return {
    id: input.id,
    maxClaims: input.maxClaims,
    creatorId: input.creatorId,
    roleId: input.roleId,
  };
}

/**
 * Maps UpdateInviteCodeInput to service input format
 */
export function mapUpdateInviteCodeInputToService(
  input: UpdateInviteCodeInput,
) {
  const result: {
    maxClaims?: number;
    roleId?: string | null;
  } = {};

  if (input.maxClaims !== undefined) result.maxClaims = input.maxClaims;
  if (input.roleId !== undefined) result.roleId = input.roleId;

  return result;
}

/**
 * Maps ClaimInviteCodeInput to service input format
 */
export function mapClaimInviteCodeInputToService(input: ClaimInviteCodeInput) {
  return {
    userId: input.userId,
  };
}

// eslint-disable-next-line @typescript-eslint/ban-types
type PrismaInviteCode = Prisma.InviteCodeGetPayload<{}>;

/**
 * Maps Prisma InviteCode result to GraphQL InviteCode entity
 * Only includes scalar fields - relations and computed fields handled by field resolvers
 */
export function mapPrismaInviteCodeToGraphQL(
  prismaInviteCode: PrismaInviteCode,
): InviteCode {
  return {
    id: prismaInviteCode.id,
    claimCount: prismaInviteCode.claimCount,
    maxClaims: prismaInviteCode.maxClaims,
    creatorId: prismaInviteCode.creatorId,
    roleId: prismaInviteCode.roleId,
    createdAt: prismaInviteCode.createdAt,
    updatedAt: prismaInviteCode.updatedAt,
    // Computed fields handled by field resolvers
    // Relations handled by field resolvers
  };
}

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaInviteCodeConnectionToGraphQL(serviceResult: {
  nodes: PrismaInviteCode[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}): InviteCodeConnection {
  return {
    nodes: serviceResult.nodes.map(mapPrismaInviteCodeToGraphQL),
    totalCount: serviceResult.totalCount,
    hasNextPage: serviceResult.hasNextPage,
    hasPreviousPage: serviceResult.hasPreviousPage,
  };
}
