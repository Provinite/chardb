import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import {
  ExternalAccountProvider,
  ItemTransactionKind,
  PendingOwnership,
  Prisma,
} from "@chardb/database";
import { notDeleted } from "../common/utils/prisma-filters";
import { ExternalAccountsService } from "../external-accounts/external-accounts.service";
import { ItemTransactionsService } from "../item-transactions/item-transactions.service";

/**
 * What a pending owner is called on the provider, as last seen. The account id
 * is the key; these are for people to find and recognise it by (#445).
 */
export interface PendingOwnerNames {
  /** The handle: a Discord or DeviantArt username. */
  displayIdentifier?: string;
  /** Discord's global_name. */
  displayName?: string;
}

@Injectable()
export class PendingOwnershipService {
  constructor(
    private prisma: DatabaseService,
    @Inject(forwardRef(() => ExternalAccountsService))
    private externalAccountsService: ExternalAccountsService,
    private itemTransactions: ItemTransactionsService,
  ) {}

  /**
   * Write the CLAIM row for an item that has just found its owner.
   *
   * The matching GRANT row recorded a null recipient precisely so this row is
   * the one that names them, rather than the history claiming an owner who did
   * not exist yet.
   *
   * Always called with the transaction that moved the item, so the ownership
   * change and its ledger row commit together.
   */
  private async recordItemClaim(
    tx: Prisma.TransactionClient,
    itemId: string,
    userId: string,
    provider: ExternalAccountProvider,
  ): Promise<void> {
    const item = await tx.item.findUnique({
      where: { id: itemId },
      include: { itemType: { select: { communityId: true } } },
    });
    if (!item) return;

    await this.itemTransactions.recordBatch(
      {
        communityId: item.itemType.communityId,
        itemTypeId: item.itemTypeId,
        itemIds: [item.id],
        kind: ItemTransactionKind.CLAIM,
        toUserId: userId,
        actorLabel: "system",
        reason: `${provider} account linked, pending grant released`,
      },
      tx,
    );
  }

  /** Whether the user belongs to the community, through any role there. */
  async isMember(
    client: Prisma.TransactionClient,
    userId: string,
    communityId: string,
  ): Promise<boolean> {
    return (
      (await client.communityMember.count({
        where: { userId, role: { communityId } },
      })) > 0
    );
  }

  /**
   * The community a pending item or character belongs to: an item through its
   * type, a character through its species. A character with no species
   * belongs to none.
   */
  private async communityOf(
    client: Prisma.TransactionClient,
    entity: { itemId?: string | null; characterId?: string | null },
  ): Promise<string | null> {
    if (entity.itemId) {
      const item = await client.item.findUnique({
        where: { id: entity.itemId },
        select: { itemType: { select: { communityId: true } } },
      });
      return item?.itemType.communityId ?? null;
    }
    if (entity.characterId) {
      const character = await client.character.findUnique({
        where: { id: entity.characterId },
        select: { species: { select: { communityId: true } } },
      });
      return character?.species?.communityId ?? null;
    }
    return null;
  }

  /**
   * Who something granted to an outside account can go to right now: the
   * account's chardb user, if they have linked it and belong to the
   * community it is from. Otherwise it waits on the account, and is claimed
   * when both are true (on linking, or on joining).
   */
  private async claimantFor(
    client: Prisma.TransactionClient,
    provider: ExternalAccountProvider,
    providerAccountId: string,
    entity: { itemId?: string | null; characterId?: string | null },
  ): Promise<string | null> {
    const account = await client.externalAccount.findUnique({
      where: {
        provider_providerAccountId: { provider, providerAccountId },
      },
      select: { userId: true },
    });
    if (!account) return null;
    const communityId = await this.communityOf(client, entity);
    if (
      communityId &&
      !(await this.isMember(client, account.userId, communityId))
    ) {
      return null;
    }
    return account.userId;
  }

  /** Hands one waiting grant to its claimant and marks it claimed. */
  private async claimOne(
    tx: Prisma.TransactionClient,
    pending: PendingOwnership,
    userId: string,
    claimedAt: Date,
  ): Promise<PendingOwnership> {
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
      await this.recordItemClaim(tx, pending.itemId, userId, pending.provider);
    }
    return tx.pendingOwnership.update({
      where: { id: pending.id },
      data: { claimedAt, claimedByUserId: userId },
      include: { character: true, item: true },
    });
  }

  /**
   * Gives a new member everything waiting for their linked accounts in the
   * community they just joined. Run in the transaction that creates the
   * membership (CommunityMembershipService.join), so joining and receiving
   * commit together.
   */
  async claimPendingInCommunity(
    tx: Prisma.TransactionClient,
    userId: string,
    communityId: string,
  ): Promise<PendingOwnership[]> {
    const linked = await tx.externalAccount.findMany({
      where: { userId },
      select: { provider: true, providerAccountId: true },
    });
    if (!linked.length) return [];

    const waiting = await tx.pendingOwnership.findMany({
      where: {
        claimedAt: null,
        OR: linked.map(({ provider, providerAccountId }) => ({
          provider,
          providerAccountId,
        })),
        AND: [
          {
            OR: [
              { item: { itemType: { communityId } } },
              { character: { species: { communityId } } },
            ],
          },
        ],
      },
    });
    const now = new Date();
    const claimed: PendingOwnership[] = [];
    for (const pending of waiting) {
      claimed.push(await this.claimOne(tx, pending, userId, now));
    }
    return claimed;
  }

  /**
   * Create a pending ownership record for a character, or hand the character
   * straight to the account's user if they have linked it and belong to the
   * character's community (see claimantFor).
   *
   * @returns Object indicating if character was claimed or pending ownership was created
   */
  async createForCharacter(
    characterId: string,
    provider: ExternalAccountProvider,
    providerAccountId: string,
    names: PendingOwnerNames = {},
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<{
    claimed: boolean;
    ownerId?: string;
    pendingOwnership?: PendingOwnership;
  }> {
    // Check if character exists
    const character = await tx.character.findFirst({
      where: { id: characterId, ...notDeleted },
    });
    if (!character) {
      throw new NotFoundException(`Character with ID ${characterId} not found`);
    }

    // Check if character already has a pending ownership
    const existing = await tx.pendingOwnership.findUnique({
      where: { characterId },
    });
    if (existing) {
      throw new ConflictException(
        `Character ${characterId} already has a pending ownership record`,
      );
    }

    const claimantId = await this.claimantFor(tx, provider, providerAccountId, {
      characterId,
    });

    if (claimantId) {
      await tx.character.update({
        where: { id: characterId },
        data: { ownerId: claimantId },
      });

      return {
        claimed: true,
        ownerId: claimantId,
      };
    }

    // Waits on the account until its person links it and is a member.
    const pendingOwnership = await tx.pendingOwnership.create({
      data: {
        characterId,
        provider,
        providerAccountId,
        displayIdentifier: names.displayIdentifier,
        displayName: names.displayName,
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
    names: PendingOwnerNames = {},
    tx?: Prisma.TransactionClient,
  ): Promise<{
    claimed: boolean;
    ownerId?: string;
    pendingOwnership?: PendingOwnership;
  }> {
    const client = tx ?? this.prisma;
    // Check if item exists
    const item = await client.item.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException(`Item with ID ${itemId} not found`);
    }

    // Check if item already has a pending ownership
    const existing = await client.pendingOwnership.findUnique({
      where: { itemId },
    });
    if (existing) {
      throw new ConflictException(
        `Item ${itemId} already has a pending ownership record`,
      );
    }

    const claimantId = await this.claimantFor(
      client,
      provider,
      providerAccountId,
      { itemId },
    );

    if (claimantId) {
      // The move and its ledger row commit together.
      const assign = async (t: Prisma.TransactionClient) => {
        await t.item.update({
          where: { id: itemId },
          data: { ownerId: claimantId },
        });
        await this.recordItemClaim(t, itemId, claimantId, provider);
      };
      if (tx) {
        await assign(tx);
      } else {
        await this.prisma.$transaction(assign);
      }

      return {
        claimed: true,
        ownerId: claimantId,
      };
    }

    // Waits on the account until its person links it and is a member.
    const pendingOwnership = await client.pendingOwnership.create({
      data: {
        itemId,
        provider,
        providerAccountId,
        displayIdentifier: names.displayIdentifier,
        displayName: names.displayName,
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
    const externalAccount =
      await this.externalAccountsService.findByProviderAndAccountId(
        provider,
        providerAccountId,
      );
    return externalAccount?.userId ?? null;
  }

  /**
   * Update a pending ownership record's provider account ID and attempt auto-claim,
   * all within a provided transaction.
   *
   * Used by the backfill job to atomically resolve a username to a UUID and claim
   * the record if the account is already linked.
   */
  async updateProviderIdAndClaim(
    tx: Prisma.TransactionClient,
    pendingOwnershipId: string,
    newProviderAccountId: string,
    provider: ExternalAccountProvider,
    entityId: { characterId?: string; itemId?: string },
    displayIdentifier?: string,
  ): Promise<{ claimed: boolean; claimedByUserId?: string }> {
    await tx.pendingOwnership.update({
      where: { id: pendingOwnershipId },
      data: {
        providerAccountId: newProviderAccountId,
        ...(displayIdentifier != null && { displayIdentifier }),
      },
    });

    // Claimed now only if the account is linked and its person is a member.
    const userId = await this.claimantFor(
      tx,
      provider,
      newProviderAccountId,
      entityId,
    );
    if (!userId) {
      return { claimed: false };
    }

    const pending = await tx.pendingOwnership.findUniqueOrThrow({
      where: { id: pendingOwnershipId },
    });
    await this.claimOne(tx, pending, userId, new Date());

    return { claimed: true, claimedByUserId: userId };
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
   * Claim what was waiting on an account its user has just linked: the
   * grants from communities they belong to, and characters with no
   * community. The rest keeps waiting until they join (claimPendingInCommunity).
   */
  async claimAllForAccount(
    userId: string,
    provider: ExternalAccountProvider,
    providerAccountId: string,
  ): Promise<PendingOwnership[]> {
    // Use a transaction to ensure atomicity and prevent race conditions
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Query for unclaimed items INSIDE transaction to ensure consistent snapshot
      const pendingItems = await tx.pendingOwnership.findMany({
        where: { provider, providerAccountId, claimedAt: null },
      });

      const claimed: PendingOwnership[] = [];
      const now = new Date();
      for (const pending of pendingItems) {
        const communityId = await this.communityOf(tx, pending);
        if (communityId && !(await this.isMember(tx, userId, communityId))) {
          continue;
        }
        claimed.push(await this.claimOne(tx, pending, userId, now));
      }
      return claimed;
    });
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
  async findByCharacterId(
    characterId: string,
  ): Promise<PendingOwnership | null> {
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
        claimedAt:
          filters?.claimed === undefined
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
