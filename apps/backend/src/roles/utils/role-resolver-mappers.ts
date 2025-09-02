import { CreateRoleInput, UpdateRoleInput } from "../dto/role.dto";
import { Role, RoleConnection } from "../entities/role.entity";
import { CreateRoleServiceInput, UpdateRoleServiceInput } from "../roles.service";
import { Prisma } from "@chardb/database";

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Maps CreateRoleInput to service input format
 */
export function mapCreateRoleInputToService(input: CreateRoleInput): CreateRoleServiceInput {
  return {
    name: input.name,
    communityId: input.communityId,
    canCreateSpecies: input.canCreateSpecies,
    canCreateCharacter: input.canCreateCharacter,
    canEditCharacter: input.canEditCharacter,
    canEditOwnCharacter: input.canEditOwnCharacter,
    canEditSpecies: input.canEditSpecies,
    canCreateInviteCode: input.canCreateInviteCode,
    canListInviteCodes: input.canListInviteCodes,
    canCreateRole: input.canCreateRole,
    canEditRole: input.canEditRole,
  };
}

/**
 * Maps UpdateRoleInput to service input format
 */
export function mapUpdateRoleInputToService(input: UpdateRoleInput): UpdateRoleServiceInput {
  const result: UpdateRoleServiceInput = {};

  if (input.name !== undefined) result.name = input.name;
  if (input.canCreateSpecies !== undefined) result.canCreateSpecies = input.canCreateSpecies;
  if (input.canCreateCharacter !== undefined) result.canCreateCharacter = input.canCreateCharacter;
  if (input.canEditCharacter !== undefined) result.canEditCharacter = input.canEditCharacter;
  if (input.canEditOwnCharacter !== undefined) result.canEditOwnCharacter = input.canEditOwnCharacter;
  if (input.canEditSpecies !== undefined) result.canEditSpecies = input.canEditSpecies;
  if (input.canCreateInviteCode !== undefined) result.canCreateInviteCode = input.canCreateInviteCode;
  if (input.canListInviteCodes !== undefined) result.canListInviteCodes = input.canListInviteCodes;
  if (input.canCreateRole !== undefined) result.canCreateRole = input.canCreateRole;
  if (input.canEditRole !== undefined) result.canEditRole = input.canEditRole;

  return result;
}

type PrismaRole = Prisma.RoleGetPayload<{}>;

/**
 * Maps Prisma Role result to GraphQL Role entity
 * Only includes scalar fields - relations handled by field resolvers
 */
export function mapPrismaRoleToGraphQL(prismaRole: PrismaRole): Role {
  return {
    id: prismaRole.id,
    name: prismaRole.name,
    communityId: prismaRole.communityId,
    canCreateSpecies: prismaRole.canCreateSpecies,
    canCreateCharacter: prismaRole.canCreateCharacter,
    canEditCharacter: prismaRole.canEditCharacter,
    canEditOwnCharacter: prismaRole.canEditOwnCharacter,
    canEditSpecies: prismaRole.canEditSpecies,
    canCreateInviteCode: prismaRole.canCreateInviteCode,
    canListInviteCodes: prismaRole.canListInviteCodes,
    canCreateRole: prismaRole.canCreateRole,
    canEditRole: prismaRole.canEditRole,
    createdAt: prismaRole.createdAt,
    updatedAt: prismaRole.updatedAt,
  };
}

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaRoleConnectionToGraphQL(serviceResult: {
  nodes: PrismaRole[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}): RoleConnection {
  return {
    nodes: serviceResult.nodes.map(mapPrismaRoleToGraphQL),
    totalCount: serviceResult.totalCount,
    hasNextPage: serviceResult.hasNextPage,
    hasPreviousPage: serviceResult.hasPreviousPage,
  };
}