import { UpdateUserInput } from "../dto/update-user.input";
import { User, UserConnection } from "../entities/user.entity";
import { CreateUserServiceInput, UpdateUserServiceInput } from "../users.service";
import { Prisma } from "@chardb/database";

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Maps CreateUserInput to service input format
 */
export function mapCreateUserInputToService(
  input: { username: string; email: string; password: string; displayName?: string }
): CreateUserServiceInput {
  return {
    username: input.username,
    email: input.email,
    passwordHash: input.password,
    displayName: input.displayName,
  };
}

/**
 * Maps UpdateUserInput to service input format
 */
export function mapUpdateUserInputToService(input: UpdateUserInput): UpdateUserServiceInput {
  const result: UpdateUserServiceInput = {};

  if (input.displayName !== undefined) result.displayName = input.displayName;
  if (input.bio !== undefined) result.bio = input.bio;
  if (input.location !== undefined) result.location = input.location;
  if (input.website !== undefined) result.website = input.website;
  if (input.dateOfBirth !== undefined) {
    result.dateOfBirth = new Date(input.dateOfBirth);
  }
  if (input.privacySettings !== undefined) result.privacySettings = input.privacySettings;

  return result;
}

type PrismaUser = Prisma.UserGetPayload<{}>;

/**
 * Maps Prisma User result to GraphQL User entity
 * Only includes scalar fields - relations handled by field resolvers
 */
export function mapPrismaUserToGraphQL(prismaUser: PrismaUser): User {
  return {
    id: prismaUser.id,
    username: prismaUser.username,
    email: prismaUser.email,
    displayName: prismaUser.displayName ?? undefined,
    bio: prismaUser.bio ?? undefined,
    avatarUrl: prismaUser.avatarUrl ?? undefined,
    location: prismaUser.location ?? undefined,
    website: prismaUser.website ?? undefined,
    dateOfBirth: prismaUser.dateOfBirth ?? undefined,
    isVerified: prismaUser.isVerified,
    isAdmin: prismaUser.isAdmin,
    privacySettings: prismaUser.privacySettings,
    canCreateCommunity: prismaUser.canCreateCommunity,
    canListUsers: prismaUser.canListUsers,
    canListInviteCodes: prismaUser.canListInviteCodes,
    canCreateInviteCode: prismaUser.canCreateInviteCode,
    canGrantGlobalPermissions: prismaUser.canGrantGlobalPermissions,
    createdAt: prismaUser.createdAt,
    updatedAt: prismaUser.updatedAt,
    externalAccounts: [], // Populated by field resolver
    communityMemberships: [], // Populated by field resolver
  };
}

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaUserConnectionToGraphQL(serviceResult: {
  nodes: PrismaUser[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}): UserConnection {
  return {
    nodes: serviceResult.nodes.map(mapPrismaUserToGraphQL),
    totalCount: serviceResult.totalCount,
    hasNextPage: serviceResult.hasNextPage,
    hasPreviousPage: serviceResult.hasPreviousPage,
  };
}