import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCommunityMemberInput, UpdateCommunityMemberInput } from './dto/community-member.dto';
import { CommunityMember, CommunityMemberConnection } from './entities/community-member.entity';

@Injectable()
export class CommunityMembersService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new community membership */
  async create(createCommunityMemberInput: CreateCommunityMemberInput): Promise<CommunityMember> {
    return this.prisma.communityMember.create({
      data: createCommunityMemberInput,
      include: {
        role: {
          include: {
            community: true,
          },
        },
        user: true,
      },
    });
  }

  /** Find all community members with pagination */
  async findAll(first: number = 20, after?: string): Promise<CommunityMemberConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [communityMembers, totalCount] = await Promise.all([
      this.prisma.communityMember.findMany({
        take: first + 1,
        skip,
        cursor,
        orderBy: [
          { role: { community: { name: 'asc' } } },
          { user: { username: 'asc' } },
        ],
        include: {
          role: {
            include: {
              community: true,
            },
          },
          user: true,
        },
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
  async findByCommunity(communityId: string, first: number = 20, after?: string): Promise<CommunityMemberConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [communityMembers, totalCount] = await Promise.all([
      this.prisma.communityMember.findMany({
        where: { role: { communityId } },
        take: first + 1,
        skip,
        cursor,
        orderBy: [
          { role: { name: 'asc' } },
          { user: { username: 'asc' } },
        ],
        include: {
          role: {
            include: {
              community: true,
            },
          },
          user: true,
        },
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
  async findByUser(userId: string, first: number = 20, after?: string): Promise<CommunityMemberConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [communityMembers, totalCount] = await Promise.all([
      this.prisma.communityMember.findMany({
        where: { userId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { role: { community: { name: 'asc' } } },
        include: {
          role: {
            include: {
              community: true,
            },
          },
          user: true,
        },
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
  async findOne(id: string): Promise<CommunityMember> {
    const communityMember = await this.prisma.communityMember.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            community: true,
          },
        },
        user: true,
      },
    });

    if (!communityMember) {
      throw new NotFoundException(`Community member with ID ${id} not found`);
    }

    return communityMember;
  }

  /** Update a community membership (change role) */
  async update(id: string, updateCommunityMemberInput: UpdateCommunityMemberInput): Promise<CommunityMember> {
    const communityMember = await this.findOne(id); // This will throw if not found

    return this.prisma.communityMember.update({
      where: { id },
      data: updateCommunityMemberInput,
      include: {
        role: {
          include: {
            community: true,
          },
        },
        user: true,
      },
    });
  }

  /** Remove a community membership */
  async remove(id: string): Promise<CommunityMember> {
    const communityMember = await this.findOne(id); // This will throw if not found

    return this.prisma.communityMember.delete({
      where: { id },
      include: {
        role: {
          include: {
            community: true,
          },
        },
        user: true,
      },
    });
  }
}