import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { Prisma } from "@chardb/database";
import { CommunityMembershipService } from "../community-membership/community-membership.service";

/**
 * Service layer input types for community member operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of GraphQL relation objects.
 */

/**
 * Input data for creating a new community member
 */
export interface CreateCommunityMemberServiceInput {
  /** The user ID */
  userId: string;
  /** The role ID */
  roleId: string;
}

/**
 * Input data for updating a community member
 */
export interface UpdateCommunityMemberServiceInput {
  /** The role ID */
  roleId?: string;
}

@Injectable()
export class CommunityMembersService {
  constructor(
    private prisma: DatabaseService,
    private membership: CommunityMembershipService,
  ) {}

  /** Create a new community membership */
  async create(input: CreateCommunityMemberServiceInput) {
    return this.prisma.$transaction((tx) => this.membership.join(tx, input));
  }

  /** Find all community members with pagination */
  async findAll(first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [communityMembers, totalCount] = await Promise.all([
      this.prisma.communityMember.findMany({
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.communityMember.count(),
    ]);

    const hasNextPage = communityMembers.length > first;
    const nodes = hasNextPage
      ? communityMembers.slice(0, -1)
      : communityMembers;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /**
   * Find community members by community ID with pagination.
   *
   * With a search, matches username, display name and role name ignoring
   * case. Exact username or display name matches come first, then the rest,
   * each newest first.
   */
  async findByCommunity(
    communityId: string,
    first: number = 20,
    after?: string,
    search?: string,
  ) {
    const term = search?.trim();
    if (term) {
      return this.searchByCommunity(communityId, term, first, after);
    }

    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [communityMembers, totalCount] = await Promise.all([
      this.prisma.communityMember.findMany({
        where: { role: { communityId } },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.communityMember.count({
        where: { role: { communityId } },
      }),
    ]);

    const hasNextPage = communityMembers.length > first;
    const nodes = hasNextPage
      ? communityMembers.slice(0, -1)
      : communityMembers;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /**
   * Search results are two lists joined end to end: exact matches, then
   * partial ones. Exact matches are few (usernames are unique), so they are
   * loaded whole, and the cursor says which list to resume in: an exact
   * match's id resumes after it, anything else is a cursor into the partial
   * list.
   */
  private async searchByCommunity(
    communityId: string,
    term: string,
    first: number,
    after?: string,
  ) {
    const orderBy: Prisma.CommunityMemberOrderByWithRelationInput[] = [
      { createdAt: "desc" },
      { id: "desc" },
    ];
    const equals = { equals: term, mode: "insensitive" } as const;
    const contains = { contains: term, mode: "insensitive" } as const;

    const exact = await this.prisma.communityMember.findMany({
      where: {
        role: { communityId },
        user: { OR: [{ username: equals }, { displayName: equals }] },
      },
      orderBy,
    });
    const exactIds = exact.map((m) => m.id);

    const partialWhere: Prisma.CommunityMemberWhereInput = {
      role: { communityId },
      id: { notIn: exactIds },
      OR: [
        { user: { username: contains } },
        { user: { displayName: contains } },
        { role: { name: contains } },
      ],
    };

    const afterExact = after ? exactIds.indexOf(after) : -1;
    const remainingExact = !after
      ? exact
      : afterExact >= 0
        ? exact.slice(afterExact + 1)
        : [];
    const fromExact = remainingExact.slice(0, first + 1);
    const partialTake = first + 1 - fromExact.length;
    const partialCursor = after && afterExact < 0 ? after : undefined;

    const [partial, partialCount] = await Promise.all([
      partialTake > 0
        ? this.prisma.communityMember.findMany({
            where: partialWhere,
            take: partialTake,
            skip: partialCursor ? 1 : 0,
            cursor: partialCursor ? { id: partialCursor } : undefined,
            orderBy,
          })
        : Promise.resolve([]),
      this.prisma.communityMember.count({ where: partialWhere }),
    ]);

    const combined = [...fromExact, ...partial];
    return {
      nodes: combined.slice(0, first),
      totalCount: exact.length + partialCount,
      hasNextPage: combined.length > first,
      hasPreviousPage: !!after,
    };
  }

  /** Find community members by user ID with pagination */
  async findByUser(userId: string, first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [communityMembers, totalCount] = await Promise.all([
      this.prisma.communityMember.findMany({
        where: { userId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.communityMember.count({
        where: { userId },
      }),
    ]);

    const hasNextPage = communityMembers.length > first;
    const nodes = hasNextPage
      ? communityMembers.slice(0, -1)
      : communityMembers;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find a community member by ID */
  async findOne(id: string) {
    const communityMember = await this.prisma.communityMember.findUnique({
      where: { id },
    });

    if (!communityMember) {
      throw new NotFoundException(`Community member with ID ${id} not found`);
    }

    return communityMember;
  }

  /** Update a community membership (change role) */
  async update(id: string, input: UpdateCommunityMemberServiceInput) {
    await this.findOne(id); // This will throw if not found

    const updateData: Prisma.CommunityMemberUpdateInput = {};

    if (input.roleId !== undefined) {
      updateData.role = {
        connect: { id: input.roleId },
      };
    }

    return this.prisma.communityMember.update({
      where: { id },
      data: updateData,
    });
  }

  /** Remove a community membership */
  async remove(id: string) {
    await this.findOne(id); // This will throw if not found

    return this.prisma.communityMember.delete({
      where: { id },
    });
  }

  /** Get user by ID for field resolvers */
  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /** Get role by ID for field resolvers */
  async getRoleById(roleId: string) {
    return this.prisma.role.findUnique({
      where: { id: roleId },
    });
  }

  /**
   * Get all roles a user has in a specific community.
   *
   * This method queries the CommunityMember join table to find all roles
   * the user has been assigned within the specified community.
   *
   * @param userId - The ID of the user
   * @param communityId - The ID of the community
   * @returns Array of Role objects with their permissions
   *
   * @example
   * ```typescript
   * const roles = await communityMembersService.getUserRolesInCommunity(userId, communityId);
   * const canEdit = roles.some(role => role.canEditCharacter);
   * ```
   */
  async getUserRolesInCommunity(userId: string, communityId: string) {
    const communityMembers = await this.prisma.communityMember.findMany({
      where: {
        userId,
        role: {
          communityId,
        },
      },
      include: {
        role: true,
      },
    });

    return communityMembers.map((member) => member.role);
  }
}
