import { Injectable, ConflictException, NotFoundException, Logger } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { ExternalAccount, ExternalAccountProvider } from "@chardb/database";
import { PendingOwnershipService } from "../pending-ownership/pending-ownership.service";

export interface LinkAccountResult {
  externalAccount: ExternalAccount;
  claimedCharacterIds: string[];
  claimedItemIds: string[];
}

@Injectable()
export class ExternalAccountsService {
  private readonly logger = new Logger(ExternalAccountsService.name);

  constructor(
    private database: DatabaseService,
    private pendingOwnershipService: PendingOwnershipService,
  ) {}

  /**
   * Find all external accounts for a user
   */
  async findByUserId(userId: string) {
    return this.database.externalAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find an external account by provider and user ID
   */
  async findByProviderAndUserId(provider: ExternalAccountProvider, userId: string) {
    return this.database.externalAccount.findUnique({
      where: {
        provider_userId: {
          provider,
          userId,
        },
      },
    });
  }

  /**
   * Find an external account by provider and account ID
   * Used to check if an external account has been claimed by a user
   */
  async findByProviderAndAccountId(
    provider: ExternalAccountProvider,
    providerAccountId: string,
  ) {
    return this.database.externalAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
    });
  }

  /**
   * Link an external account to a user
   * Automatically claims any pending items/characters for this account
   */
  async linkExternalAccount(
    userId: string,
    provider: ExternalAccountProvider,
    providerAccountId: string,
    displayName: string,
  ): Promise<LinkAccountResult> {
    // Check if this provider account is already linked to another user
    const existingAccount = await this.database.externalAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
    });

    if (existingAccount) {
      if (existingAccount.userId === userId) {
        throw new ConflictException("This account is already linked to your profile");
      }
      throw new ConflictException("This external account is already linked to another user");
    }

    // Check if user already has an account linked for this provider
    const existingUserLink = await this.findByProviderAndUserId(provider, userId);
    if (existingUserLink) {
      throw new ConflictException(`You already have a ${provider} account linked. Please unlink it first.`);
    }

    // Create the link
    const externalAccount = await this.database.externalAccount.create({
      data: {
        userId,
        provider,
        providerAccountId,
        displayName,
      },
    });

    // Automatically claim any pending items/characters for this account
    this.logger.log(`Checking for pending items for ${provider}:${providerAccountId}...`);
    const claimedItems = await this.pendingOwnershipService.claimAllForAccount(
      userId,
      provider,
      providerAccountId,
    );

    const claimedCharacterIds = claimedItems
      .filter((item) => item.characterId)
      .map((item) => item.characterId!);

    const claimedItemIds = claimedItems
      .filter((item) => item.itemId)
      .map((item) => item.itemId!);

    if (claimedItems.length > 0) {
      this.logger.log(
        `Claimed ${claimedCharacterIds.length} characters and ${claimedItemIds.length} items for user ${userId}`,
      );
    } else {
      this.logger.log(`No pending items found for ${provider}:${providerAccountId}`);
    }

    return {
      externalAccount,
      claimedCharacterIds,
      claimedItemIds,
    };
  }

  /**
   * Unlink an external account from a user
   */
  async unlinkExternalAccount(userId: string, provider: ExternalAccountProvider) {
    const existingAccount = await this.findByProviderAndUserId(provider, userId);

    if (!existingAccount) {
      throw new NotFoundException(`No ${provider} account found linked to your profile`);
    }

    await this.database.externalAccount.delete({
      where: { id: existingAccount.id },
    });

    return true;
  }
}
