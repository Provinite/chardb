import { Injectable, ConflictException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ExternalAccountProvider, PendingOwnership, Prisma } from '@chardb/database';
import { ExternalAccountsService } from '../external-accounts/external-accounts.service';

@Injectable()
export class PendingOwnershipService {
  constructor(
    private prisma: DatabaseService,
    @Inject(forwardRef(() => ExternalAccountsService))
    private externalAccountsService: ExternalAccountsService,
  ) {}

  /**
   * Create a pending ownership record for a character, with auto-claim if account is already linked.
   *
   * If the external account is already linked to a user, the character is automatically claimed
   * (assigned to that user) instead of creating a pending ownership record.
   *
   * @returns Object indicating if character was claimed or pending ownership was created
   */
  async createForCharacter(
    characterId: string,
    provider: ExternalAccountProvider,
    providerAccountId: string,
    displayIdentifier?: string,
  ): Promise<{ claimed: boolean; ownerId?: string; pendingOwnership?: PendingOwnership }> {
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

    // Check if the external account is already linked to a user (auto-claim check)
    const claimedUserId = await this.checkIfAccountClaimed(provider, providerAccountId);

    if (claimedUserId) {
      // Account is already claimed - assign character to the user who owns the account
      await this.prisma.character.update({
        where: { id: characterId },
        data: { ownerId: claimedUserId },
      });

      return {
        claimed: true,
        ownerId: claimedUserId,
      };
    }

    // Account not claimed - create pending ownership record
    const pendingOwnership = await this.prisma.pendingOwnership.create({
      data: {
        characterId,
        provider,
        providerAccountId,
        displayIdentifier,
      },
    });

    return {
      claimed: false,
      pendingOwnership,
    };
  }

  /**
   * Create a pending ownership record for an item, with auto-claim if account is already linked.
   *
   * If the external account is already linked to a user, the item is automatically claimed
   * (assigned to that user) instead of creating a pending ownership record.
   *
   * @returns Object indicating if item was claimed or pending ownership was created
   */
  async createForItem(
    itemId: string,
    provider: ExternalAccountProvider,
    providerAccountId: string,
    displayIdentifier?: string,
  ): Promise<{ claimed: boolean; ownerId?: string; pendingOwnership?: PendingOwnership }> {
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

    // Check if the external account is already linked to a user (auto-claim check)
    const claimedUserId = await this.checkIfAccountClaimed(provider, providerAccountId);

    if (claimedUserId) {
      // Account is already claimed - assign item to the user who owns the account
      await this.prisma.item.update({
        where: { id: itemId },
        data: { ownerId: claimedUserId },
      });

      return {
        claimed: true,
        ownerId: claimedUserId,
      };
    }

    // Account not claimed - create pending ownership record
    const pendingOwnership = await this.prisma.pendingOwnership.create({
      data: {
        itemId,
        provider,
        providerAccountId,
        displayIdentifier,
      },
    });

    return {
      claimed: false,
      pendingOwnership,
    };
  }

  /**
   * Check if an external account has already been claimed by a user.
   * Returns the userId if the account is claimed, null otherwise.
   * Used to prevent creating pending ownership for already-registered users.
   */
  async checkIfAccountClaimed(
    provider: ExternalAccountProvider,
    providerAccountId: string,
  ): Promise<string | null> {
    const externalAccount = await this.externalAccountsService.findByProviderAndAccountId(
      provider,
      providerAccountId,
    );
    return externalAccount?.userId ?? null;
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
    // Use a transaction to ensure atomicity and prevent race conditions
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Query for unclaimed items INSIDE transaction to ensure consistent snapshot
      const pendingItems = await tx.pendingOwnership.findMany({
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

      if (pendingItems.length === 0) {
        return [];
      }

      const claimed: PendingOwnership[] = [];
      const now = new Date();

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
   * Find pending ownership for a character
   */
  async findByCharacterId(characterId: string): Promise<PendingOwnership | null> {
    return this.prisma.pendingOwnership.findUnique({
      where: { characterId },
    });
  }

  /**
   * Find pending ownership for an item
   */
  async findByItemId(itemId: string): Promise<PendingOwnership | null> {
    return this.prisma.pendingOwnership.findUnique({
      where: { itemId },
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
