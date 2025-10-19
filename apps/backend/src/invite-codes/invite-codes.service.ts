import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '@chardb/database';

/**
 * Service layer input types for invite codes operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of Prisma relation objects.
 */

/**
 * Input data for creating a new invite code
 */
interface CreateInviteCodeServiceInput {
  /** The invite code string (alphanumeric and hyphens only) */
  id: string;
  /** Maximum number of times this invite code can be claimed */
  maxClaims: number;
  /** The user who is creating this invite code */
  creatorId: string;
  /** The role to grant when this invite code is used (optional) */
  roleId?: string | null;
}

/**
 * Input data for updating an invite code
 */
interface UpdateInviteCodeServiceInput {
  /** Maximum number of times this invite code can be claimed */
  maxClaims?: number;
  /** The role to grant when this invite code is used (optional) */
  roleId?: string | null;
}

/**
 * Input data for claiming an invite code
 */
interface ClaimInviteCodeServiceInput {
  /** The user who is claiming this invite code */
  userId: string;
}

@Injectable()
export class InviteCodesService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new invite code */
  async create(input: CreateInviteCodeServiceInput) {
    try {
      return await this.prisma.inviteCode.create({
        data: {
          id: input.id,
          maxClaims: input.maxClaims,
          creator: {
            connect: { id: input.creatorId },
          },
          ...(input.roleId && {
            role: { connect: { id: input.roleId } },
          }),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'An invite code with this ID already exists',
        );
      }
      throw error;
    }
  }

  /** Find all invite codes with pagination */
  async findAll(first: number = 20, after?: string, communityId?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    // Build where clause based on communityId parameter
    const whereClause: Prisma.InviteCodeWhereInput =
      communityId === null
        ? { roleId: null } // Global invite codes have no role (roleId is null)
        : communityId
          ? {
              role: {
                communityId: communityId,
              },
            } // Community-specific invite codes
          : {}; // If communityId is undefined, return all codes

    const [inviteCodes, totalCount] = await Promise.all([
      this.prisma.inviteCode.findMany({
        where: whereClause,
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inviteCode.count({
        where: whereClause,
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

  /** Find invite codes by creator ID with pagination */
  async findByCreator(creatorId: string, first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [inviteCodes, totalCount] = await Promise.all([
      this.prisma.inviteCode.findMany({
        where: { creatorId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
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
  async findByRole(roleId: string, first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [inviteCodes, totalCount] = await Promise.all([
      this.prisma.inviteCode.findMany({
        where: { roleId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
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
  async findOne(id: string) {
    const inviteCode = await this.prisma.inviteCode.findUnique({
      where: { id },
    });

    if (!inviteCode) {
      throw new NotFoundException(`Invite code with ID ${id} not found`);
    }

    return inviteCode;
  }

  /** Update an invite code */
  async update(id: string, input: UpdateInviteCodeServiceInput) {
    const inviteCode = await this.findOne(id); // This will throw if not found

    // Validate that we're not reducing maxClaims below current claimCount
    if (
      input.maxClaims !== undefined &&
      input.maxClaims < inviteCode.claimCount
    ) {
      throw new BadRequestException(
        `Cannot set maxClaims (${input.maxClaims}) below current claimCount (${inviteCode.claimCount})`,
      );
    }

    const updateData: Prisma.InviteCodeUpdateInput = {};

    if (input.maxClaims !== undefined) updateData.maxClaims = input.maxClaims;
    if (input.roleId !== undefined) {
      if (input.roleId === null) {
        updateData.role = { disconnect: true };
      } else {
        updateData.role = { connect: { id: input.roleId } };
      }
    }

    return this.prisma.inviteCode.update({
      where: { id },
      data: updateData,
    });
  }

  /** Claim an invite code (use it to join a community) */
  async claim(id: string, input: ClaimInviteCodeServiceInput) {
    const inviteCode = await this.findOne(id);

    // Check if invite code is still available
    if (inviteCode.claimCount >= inviteCode.maxClaims) {
      throw new BadRequestException('This invite code has been fully claimed');
    }

    // Use transaction to ensure atomicity between claim increment and membership creation
    return await this.prisma.$transaction(async (tx) => {
      // Increment claim count
      const updatedInviteCode = await tx.inviteCode.update({
        where: { id },
        data: {
          claimCount: {
            increment: 1,
          },
        },
      });

      // If there's a role associated, create community membership
      if (inviteCode.roleId) {
        try {
          await tx.communityMember.create({
            data: {
              role: { connect: { id: inviteCode.roleId } },
              user: { connect: { id: input.userId } },
            },
          });
        } catch (error: any) {
          // Handle unique constraint violation with a more user-friendly error
          if (error.code === 'P2002') {
            throw new ConflictException(
              'You are already a member of this community',
            );
          }
          throw error;
        }
      }

      return updatedInviteCode;
    });
  }

  /** Remove an invite code */
  async remove(id: string) {
    await this.findOne(id); // This will throw if not found

    return this.prisma.inviteCode.delete({
      where: { id },
    });
  }
}
