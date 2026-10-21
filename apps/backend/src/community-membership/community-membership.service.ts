import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import type { CommunityMember, Prisma } from "@chardb/database";
import { PendingOwnershipService } from "../pending-ownership/pending-ownership.service";

/**
 * The one way into a community.
 *
 * A community's items and characters only go to its members, so whatever was
 * granted to someone's linked accounts there waits until they join. Joining
 * hands it over, in the same transaction that creates the membership: nobody
 * is ever a member with their prizes still waiting, or holds them without
 * being one. A spec (single-join-path.spec.ts) fails if a membership is
 * created anywhere else.
 */
@Injectable()
export class CommunityMembershipService {
  constructor(
    @Inject(forwardRef(() => PendingOwnershipService))
    private readonly pendingOwnership: PendingOwnershipService,
  ) {}

  async join(
    tx: Prisma.TransactionClient,
    input: { userId: string; roleId: string },
  ): Promise<CommunityMember> {
    const role = await tx.role.findUnique({
      where: { id: input.roleId },
      select: { communityId: true },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${input.roleId} not found`);
    }
    const member = await tx.communityMember.create({
      data: { userId: input.userId, roleId: input.roleId },
    });
    await this.pendingOwnership.claimPendingInCommunity(
      tx,
      input.userId,
      role.communityId,
    );
    return member;
  }
}
