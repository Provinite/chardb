import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { Prisma } from "@chardb/database";

/**
 * Service layer input types for communities operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of Prisma relation objects.
 */

/**
 * Input data for creating a new community
 */
export interface CreateCommunityServiceInput {
  /** Name of the community (must be unique) */
  name: string;
  /** ID of the user creating the community (will become admin) */
  creatorId: string;
}

/**
 * Input data for updating a community
 */
export interface UpdateCommunityServiceInput {
  /** Name of the community (must be unique) */
  name?: string;
  /** Discord guild (server) ID */
  discordGuildId?: string | null;
  /** Discord guild (server) name for display */
  discordGuildName?: string | null;
}

@Injectable()
export class CommunitiesService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new community with default roles and admin membership */
  async create(input: CreateCommunityServiceInput) {
    return this.prisma.$transaction(async (prisma) => {
      // 1. Create the community
      const community = await prisma.community.create({
        data: {
          name: input.name,
        },
      });

      // 2. Create default roles
      const adminRole = await prisma.role.create({
        data: {
          name: "Admin",
          communityId: community.id,
          canCreateSpecies: true,
          canCreateCharacter: true,
          canCreateOrphanedCharacter: true,
          canEditCharacter: true,
          canEditOwnCharacter: true,
          canEditOwnCharacterRegistry: true,
          canEditCharacterRegistry: true,
          canEditSpecies: true,
          canCreateInviteCode: true,
          canListInviteCodes: true,
          canCreateRole: true,
          canEditRole: true,
          canRemoveCommunityMember: true,
          canManageMemberRoles: true,
          canManageItems: true,
          canGrantItems: true,
          canUploadOwnCharacterImages: true,
          canUploadCharacterImages: true,
          canModerateImages: true,
          canDeleteCharacter: true,
        },
      });

      await prisma.role.create({
        data: {
          name: "Moderator",
          communityId: community.id,
          canCreateSpecies: false,
          canCreateCharacter: true,
          canEditCharacter: true,
          canEditOwnCharacter: true,
          canEditOwnCharacterRegistry: true,
          canEditCharacterRegistry: true,
          canEditSpecies: true,
          canCreateInviteCode: false,
          canListInviteCodes: false,
          canModerateImages: true,
          canCreateRole: false,
          canEditRole: false,
          canManageItems: false,
          canGrantItems: true,
          canUploadOwnCharacterImages: true,
          canUploadCharacterImages: true,
        },
      });

      await prisma.role.create({
        data: {
          name: "Member",
          communityId: community.id,
          canCreateSpecies: false,
          canCreateCharacter: true,
          canEditCharacter: false,
          canEditOwnCharacter: true,
          canEditSpecies: false,
          canCreateInviteCode: false,
          canListInviteCodes: false,
          canCreateRole: false,
          canEditRole: false,
          canManageItems: false,
          canGrantItems: false,
          canUploadOwnCharacterImages: true,
          canUploadCharacterImages: false,
        },
      });

      // 3. Create admin membership for the creator
      await prisma.communityMember.create({
        data: {
          userId: input.creatorId,
          roleId: adminRole.id,
        },
      });

      return community;
    });
  }

  /** Find all communities with pagination */
  async findAll(first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [communities, totalCount] = await Promise.all([
      this.prisma.community.findMany({
        take: first + 1, // Take one extra to check if there's a next page
        skip,
        cursor,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.community.count(),
    ]);

    const hasNextPage = communities.length > first;
    const nodes = hasNextPage ? communities.slice(0, -1) : communities;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find a community by ID */
  async findOne(id: string) {
    const community = await this.prisma.community.findUnique({
      where: { id },
    });

    if (!community) {
      throw new NotFoundException(`Community with ID ${id} not found`);
    }

    return community;
  }

  /** Update a community */
  async update(id: string, input: UpdateCommunityServiceInput) {
    await this.findOne(id); // This will throw if not found

    const updateData: Prisma.CommunityUpdateInput = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.discordGuildId !== undefined)
      updateData.discordGuildId = input.discordGuildId;
    if (input.discordGuildName !== undefined)
      updateData.discordGuildName = input.discordGuildName;

    return this.prisma.community.update({
      where: { id },
      data: updateData,
    });
  }

  /** Remove a community */
  async remove(id: string) {
    await this.findOne(id); // This will throw if not found

    return this.prisma.community.delete({
      where: { id },
    });
  }

  /**
   * Get community members with optional search filtering.
   *
   * Whoever is called exactly what was typed comes first, then everyone the
   * search is merely a substring of. Two queries rather than one, because the
   * limit is applied in SQL: sorting after the fact would only reorder the
   * page the database already chose, and the person you named can lose that
   * cut to five people who merely contain your spelling of them.
   */
  async getMembers(
    communityId: string,
    filters: { search?: string; limit?: number },
  ) {
    const member: Prisma.UserWhereInput = {
      communityMemberships: {
        some: {
          role: { communityId },
        },
      },
    };
    const select = {
      id: true,
      username: true,
      displayName: true,
      avatarImageId: true,
    };
    const take = Math.min(filters.limit || 10, 20); // Max 20
    const search = filters.search?.trim();

    if (!search) {
      return this.prisma.user.findMany({
        where: member,
        select,
        take,
        orderBy: { username: "asc" },
      });
    }

    const exact = await this.prisma.user.findMany({
      where: {
        ...member,
        OR: [
          { username: { equals: search, mode: "insensitive" } },
          { displayName: { equals: search, mode: "insensitive" } },
        ],
      },
      select,
      take,
      orderBy: { username: "asc" },
    });

    if (exact.length >= take) return exact;

    const partial = await this.prisma.user.findMany({
      where: {
        ...member,
        id: { notIn: exact.map((user) => user.id) },
        OR: [
          { username: { contains: search, mode: "insensitive" } },
          { displayName: { contains: search, mode: "insensitive" } },
        ],
      },
      select,
      take: take - exact.length,
      orderBy: { username: "asc" },
    });

    return [...exact, ...partial];
  }

  /**
   * Count the members of a community. Membership is reached through Role, so
   * this counts memberships whose role belongs to the community.
   */
  async countMembers(communityId: string) {
    return this.prisma.communityMember.count({
      where: { role: { communityId } },
    });
  }
}
