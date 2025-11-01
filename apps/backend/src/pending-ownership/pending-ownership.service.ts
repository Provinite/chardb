import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ExternalAccountProvider, PendingOwnership, Prisma } from '@chardb/database';

@Injectable()
export class PendingOwnershipService {
  constructor(private prisma: DatabaseService) {}

  /**
   * Create a pending ownership record for a character
   */
  async createForCharacter(
    characterId: string,
    provider: ExternalAccountProvider,
    providerAccountId: string,
  ): Promise<PendingOwnership> {
    // Check if character exists
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });
    if (!character) {
      throw new NotFoundException(`Character with ID ${characterId} not found`);
    }

    // Check if character already has a pending ownership
    const existing = await this.prisma.pendingOwnership.findUnique({
      where: { characterId },
    });
    if (existing) {
      throw new ConflictException(
        `Character ${characterId} already has a pending ownership record`,
      );
    }

    return this.prisma.pendingOwnership.create({
      data: {
        characterId,
        provider,
        providerAccountId,
      },
    });
  }

  /**
   * Create a pending ownership record for an item
   */
  async createForItem(
    itemId: string,
    provider: ExternalAccountProvider,
    providerAccountId: string,
  ): Promise<PendingOwnership> {
    // Check if item exists
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException(`Item with ID ${itemId} not found`);
    }

    // Check if item already has a pending ownership
    const existing = await this.prisma.pendingOwnership.findUnique({
      where: { itemId },
    });
    if (existing) {
      throw new ConflictException(
        `Item ${itemId} already has a pending ownership record`,
      );
    }

    return this.prisma.pendingOwnership.create({
      data: {
        itemId,
        provider,
        providerAccountId,
      },
    });
  }

  /**
   * Find all pending ownership records for a given external account
   * Only returns unclaimed records
   */
  async findUnclaimedByAccount(
    provider: ExternalAccountProvider,
    providerAccountId: string,
  ): Promise<PendingOwnership[]> {
    return this.prisma.pendingOwnership.findMany({
      where: {
        provider,
        providerAccountId,
        claimedAt: null,
      },
      include: {
        character: true,
        item: true,
      },
    });
  }

  /**
   * Claim all pending items for an account
   * This transfers ownership of all pending characters and items to the user
   * Returns the list of claimed items
   */
  async claimAllForAccount(
    userId: string,
    provider: ExternalAccountProvider,
    providerAccountId: string,
  ): Promise<PendingOwnership[]> {
    const pendingItems = await this.findUnclaimedByAccount(
      provider,
      providerAccountId,
    );

    if (pendingItems.length === 0) {
      return [];
    }

    const now = new Date();

    // Use a transaction to ensure atomicity
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const claimed: PendingOwnership[] = [];

      for (const pending of pendingItems) {
        // Transfer ownership based on entity type
        if (pending.characterId) {
          await tx.character.update({
            where: { id: pending.characterId },
            data: { ownerId: userId },
          });
        } else if (pending.itemId) {
          await tx.item.update({
            where: { id: pending.itemId },
            data: { ownerId: userId },
          });
        }

        // Mark as claimed
        const updated = await tx.pendingOwnership.update({
          where: { id: pending.id },
          data: {
            claimedAt: now,
            claimedByUserId: userId,
          },
          include: {
            character: true,
            item: true,
          },
        });

        claimed.push(updated);
      }

      return claimed;
    });

    return result;
  }

  /**
   * Remove a pending ownership record (admin function)
   */
  async remove(id: string): Promise<PendingOwnership> {
    return this.prisma.pendingOwnership.delete({
      where: { id },
    });
  }

  /**
   * Find a pending ownership by ID
   */
  async findById(id: string): Promise<PendingOwnership | null> {
    return this.prisma.pendingOwnership.findUnique({
      where: { id },
      include: {
        character: true,
        item: true,
        claimedByUser: true,
      },
    });
  }

  /**
   * Find all pending ownership records with optional filters
   */
  async findAll(filters?: {
    provider?: ExternalAccountProvider;
    providerAccountId?: string;
    claimed?: boolean;
  }): Promise<PendingOwnership[]> {
    return this.prisma.pendingOwnership.findMany({
      where: {
        provider: filters?.provider,
        providerAccountId: filters?.providerAccountId,
        claimedAt: filters?.claimed === undefined
          ? undefined
          : filters.claimed
            ? { not: null }
            : null,
      },
      include: {
        character: true,
        item: true,
        claimedByUser: true,
      },
    });
  }
}
