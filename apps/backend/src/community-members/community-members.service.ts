import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '@chardb/database';

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

type PrismaCommunityMember = Prisma.CommunityMemberGetPayload<{}>;

@Injectable()
export class CommunityMembersService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new community membership */
  async create(input: CreateCommunityMemberServiceInput) {
    return this.prisma.communityMember.create({
      data: {
        user: {
          connect: { id: input.userId }
        },
        role: {
          connect: { id: input.roleId }
        }
      },
    });
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
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.communityMember.count(),
    ]);

    const hasNextPage = communityMembers.length > first;
    const nodes = hasNextPage ? communityMembers.slice(0, -1) : communityMembers;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find community members by community ID with pagination */
  async findByCommunity(communityId: string, first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [communityMembers, totalCount] = await Promise.all([
      this.prisma.communityMember.findMany({
        where: { role: { communityId } },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.communityMember.count({
        where: { role: { communityId } },
      }),
    ]);

    const hasNextPage = communityMembers.length > first;
    const nodes = hasNextPage ? communityMembers.slice(0, -1) : communityMembers;

    return {
      nodes,
      totalCount,
      hasNextPage,
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
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.communityMember.count({
        where: { userId },
      }),
    ]);

    const hasNextPage = communityMembers.length > first;
    const nodes = hasNextPage ? communityMembers.slice(0, -1) : communityMembers;

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
        connect: { id: input.roleId }
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
}