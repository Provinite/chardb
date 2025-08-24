import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateInviteCodeInput, UpdateInviteCodeInput, ClaimInviteCodeInput } from './dto/invite-code.dto';
import { InviteCode, InviteCodeConnection } from './entities/invite-code.entity';

@Injectable()
export class InviteCodesService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new invite code */
  async create(createInviteCodeInput: CreateInviteCodeInput): Promise<InviteCode> {
    try {
      return await this.prisma.inviteCode.create({
        data: {
          id: createInviteCodeInput.id,
          maxClaims: createInviteCodeInput.maxClaims,
          creatorId: createInviteCodeInput.creatorId,
          roleId: createInviteCodeInput.roleId,
        },
        include: {
          creator: true,
          role: {
            include: {
              community: true,
            },
          },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('An invite code with this ID already exists');
      }
      throw error;
    }
  }

  /** Find all invite codes with pagination */
  async findAll(first: number = 20, after?: string): Promise<InviteCodeConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [inviteCodes, totalCount] = await Promise.all([
      this.prisma.inviteCode.findMany({
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: true,
          role: {
            include: {
              community: true,
            },
          },
        },
      }),
      this.prisma.inviteCode.count(),
    ]);

    const hasNextPage = inviteCodes.length > first;
    const nodes = hasNextPage ? inviteCodes.slice(0, -1) : inviteCodes;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find invite codes by creator ID with pagination */
  async findByCreator(creatorId: string, first: number = 20, after?: string): Promise<InviteCodeConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [inviteCodes, totalCount] = await Promise.all([
      this.prisma.inviteCode.findMany({
        where: { creatorId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: true,
          role: {
            include: {
              community: true,
            },
          },
        },
      }),
      this.prisma.inviteCode.count({
        where: { creatorId },
      }),
    ]);

    const hasNextPage = inviteCodes.length > first;
    const nodes = hasNextPage ? inviteCodes.slice(0, -1) : inviteCodes;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find invite codes by role ID with pagination */
  async findByRole(roleId: string, first: number = 20, after?: string): Promise<InviteCodeConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [inviteCodes, totalCount] = await Promise.all([
      this.prisma.inviteCode.findMany({
        where: { roleId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: true,
          role: {
            include: {
              community: true,
            },
          },
        },
      }),
      this.prisma.inviteCode.count({
        where: { roleId },
      }),
    ]);

    const hasNextPage = inviteCodes.length > first;
    const nodes = hasNextPage ? inviteCodes.slice(0, -1) : inviteCodes;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find an invite code by ID */
  async findOne(id: string): Promise<InviteCode> {
    const inviteCode = await this.prisma.inviteCode.findUnique({
      where: { id },
      include: {
        creator: true,
        role: {
          include: {
            community: true,
          },
        },
      },
    });

    if (!inviteCode) {
      throw new NotFoundException(`Invite code with ID ${id} not found`);
    }

    return inviteCode;
  }

  /** Update an invite code */
  async update(id: string, updateInviteCodeInput: UpdateInviteCodeInput): Promise<InviteCode> {
    const inviteCode = await this.findOne(id); // This will throw if not found

    // Validate that we're not reducing maxClaims below current claimCount
    if (updateInviteCodeInput.maxClaims !== undefined && 
        updateInviteCodeInput.maxClaims < inviteCode.claimCount) {
      throw new BadRequestException(`Cannot set maxClaims (${updateInviteCodeInput.maxClaims}) below current claimCount (${inviteCode.claimCount})`);
    }

    return this.prisma.inviteCode.update({
      where: { id },
      data: updateInviteCodeInput,
      include: {
        creator: true,
        role: {
          include: {
            community: true,
          },
        },
      },
    });
  }

  /** Claim an invite code (use it to join a community) */
  async claim(id: string, claimInviteCodeInput: ClaimInviteCodeInput): Promise<InviteCode> {
    const inviteCode = await this.findOne(id);

    // Check if invite code is still available
    if (inviteCode.claimCount >= inviteCode.maxClaims) {
      throw new BadRequestException('This invite code has been fully claimed');
    }

    // Increment claim count
    const updatedInviteCode = await this.prisma.inviteCode.update({
      where: { id },
      data: {
        claimCount: {
          increment: 1,
        },
      },
      include: {
        creator: true,
        role: {
          include: {
            community: true,
          },
        },
      },
    });

    // If there's a role associated, create community membership
    if (inviteCode.roleId) {
      await this.prisma.communityMember.create({
        data: {
          roleId: inviteCode.roleId,
          userId: claimInviteCodeInput.userId,
        },
      });
    }

    return updatedInviteCode;
  }

  /** Remove an invite code */
  async remove(id: string): Promise<InviteCode> {
    const inviteCode = await this.findOne(id); // This will throw if not found

    return this.prisma.inviteCode.delete({
      where: { id },
      include: {
        creator: true,
        role: {
          include: {
            community: true,
          },
        },
      },
    });
  }
}