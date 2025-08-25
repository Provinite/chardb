import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCommunityInvitationInput, RespondToCommunityInvitationInput } from './dto/community-invitation.dto';
import type { CommunityInvitation } from '@chardb/database';

@Injectable()
export class CommunityInvitationsService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new community invitation */
  async create(createCommunityInvitationInput: CreateCommunityInvitationInput): Promise<CommunityInvitation> {
    // Check if there's already a pending invitation for this role and invitee
    const existingInvitation = await this.prisma.communityInvitation.findFirst({
      where: {
        roleId: createCommunityInvitationInput.roleId,
        inviteeId: createCommunityInvitationInput.inviteeId,
        acceptedAt: null,
        declinedAt: null,
      },
    });

    if (existingInvitation) {
      throw new BadRequestException('A pending invitation for this role and user already exists');
    }

    return this.prisma.communityInvitation.create({
      data: createCommunityInvitationInput,
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
  async findByCommunity(communityId: string, first: number = 20, after?: string): Promise<> {
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
  async findByInvitee(inviteeId: string, first: number = 20, after?: string): Promise<> {
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
  async findByInviter(inviterId: string, first: number = 20, after?: string): Promise<> {
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
  async findOne(id: string): Promise<CommunityInvitation> {
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
  async respond(id: string, respondInput: RespondToCommunityInvitationInput): Promise<CommunityInvitation> {
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
  async remove(id: string): Promise<CommunityInvitation> {
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