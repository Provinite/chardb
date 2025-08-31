import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '@chardb/database';

/**
 * Service layer input types for community invitations operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of Prisma relation objects.
 */

/**
 * Input data for creating a new community invitation
 */
interface CreateCommunityInvitationServiceInput {
  /** The ID of the role to grant when the invitation is accepted */
  roleId: string;
  /** The ID of the user being invited */
  inviteeId: string;
  /** The ID of the user who is creating the invitation */
  inviterId: string;
  /** The ID of the community the invitation is for */
  communityId: string;
}

/**
 * Input data for responding to a community invitation
 */
interface RespondToCommunityInvitationServiceInput {
  /** Whether to accept (true) or decline (false) the invitation */
  accept: boolean;
}

@Injectable()
export class CommunityInvitationsService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new community invitation */
  async create(input: CreateCommunityInvitationServiceInput) {
    // Check if there's already a pending invitation for this role and invitee
    const existingInvitation = await this.prisma.communityInvitation.findFirst({
      where: {
        roleId: input.roleId,
        inviteeId: input.inviteeId,
        acceptedAt: null,
        declinedAt: null,
      },
    });

    if (existingInvitation) {
      throw new BadRequestException('A pending invitation for this role and user already exists');
    }

    return this.prisma.communityInvitation.create({
      data: input,
      include: {
        role: {
          include: {
            community: true,
          },
        },
        invitee: true,
        inviter: true,
        community: true,
      },
    });
  }

  /** Find all community invitations with pagination */
  async findAll(first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [communityInvitations, totalCount] = await Promise.all([
      this.prisma.communityInvitation.findMany({
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
        include: {
          role: {
            include: {
              community: true,
            },
          },
          invitee: true,
          inviter: true,
          community: true,
        },
      }),
      this.prisma.communityInvitation.count(),
    ]);

    const hasNextPage = communityInvitations.length > first;
    const nodes = hasNextPage ? communityInvitations.slice(0, -1) : communityInvitations;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find community invitations by community ID with pagination */
  async findByCommunity(communityId: string, first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [communityInvitations, totalCount] = await Promise.all([
      this.prisma.communityInvitation.findMany({
        where: { communityId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
        include: {
          role: {
            include: {
              community: true,
            },
          },
          invitee: true,
          inviter: true,
          community: true,
        },
      }),
      this.prisma.communityInvitation.count({
        where: { communityId },
      }),
    ]);

    const hasNextPage = communityInvitations.length > first;
    const nodes = hasNextPage ? communityInvitations.slice(0, -1) : communityInvitations;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find community invitations by invitee ID with pagination */
  async findByInvitee(inviteeId: string, first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [communityInvitations, totalCount] = await Promise.all([
      this.prisma.communityInvitation.findMany({
        where: { inviteeId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
        include: {
          role: {
            include: {
              community: true,
            },
          },
          invitee: true,
          inviter: true,
          community: true,
        },
      }),
      this.prisma.communityInvitation.count({
        where: { inviteeId },
      }),
    ]);

    const hasNextPage = communityInvitations.length > first;
    const nodes = hasNextPage ? communityInvitations.slice(0, -1) : communityInvitations;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find community invitations by inviter ID with pagination */
  async findByInviter(inviterId: string, first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [communityInvitations, totalCount] = await Promise.all([
      this.prisma.communityInvitation.findMany({
        where: { inviterId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
        include: {
          role: {
            include: {
              community: true,
            },
          },
          invitee: true,
          inviter: true,
          community: true,
        },
      }),
      this.prisma.communityInvitation.count({
        where: { inviterId },
      }),
    ]);

    const hasNextPage = communityInvitations.length > first;
    const nodes = hasNextPage ? communityInvitations.slice(0, -1) : communityInvitations;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find a community invitation by ID */
  async findOne(id: string) {
    const communityInvitation = await this.prisma.communityInvitation.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            community: true,
          },
        },
        invitee: true,
        inviter: true,
        community: true,
      },
    });

    if (!communityInvitation) {
      throw new NotFoundException(`Community invitation with ID ${id} not found`);
    }

    return communityInvitation;
  }

  /** Respond to a community invitation (accept or decline) */
  async respond(id: string, respondInput: RespondToCommunityInvitationServiceInput) {
    const invitation = await this.findOne(id);

    if (invitation.acceptedAt || invitation.declinedAt) {
      throw new BadRequestException('This invitation has already been responded to');
    }

    const updateData = respondInput.accept
      ? { acceptedAt: new Date() }
      : { declinedAt: new Date() };

    const updatedInvitation = await this.prisma.communityInvitation.update({
      where: { id },
      data: updateData,
      include: {
        role: {
          include: {
            community: true,
          },
        },
        invitee: true,
        inviter: true,
        community: true,
      },
    });

    // If accepted, create the community membership
    if (respondInput.accept) {
      await this.prisma.communityMember.create({
        data: {
          roleId: invitation.roleId,
          userId: invitation.inviteeId,
        },
      });
    }

    return updatedInvitation;
  }

  /** Remove a community invitation */
  async remove(id: string) {
    const communityInvitation = await this.findOne(id); // This will throw if not found

    return this.prisma.communityInvitation.delete({
      where: { id },
      include: {
        role: {
          include: {
            community: true,
          },
        },
        invitee: true,
        inviter: true,
        community: true,
      },
    });
  }
}