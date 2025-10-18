import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { ExternalAccountProvider } from "@prisma/client";

@Injectable()
export class ExternalAccountsService {
  constructor(private database: DatabaseService) {}

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
   * Link an external account to a user
   */
  async linkExternalAccount(
    userId: string,
    provider: ExternalAccountProvider,
    providerAccountId: string,
    displayName: string,
  ) {
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
    return this.database.externalAccount.create({
      data: {
        userId,
        provider,
        providerAccountId,
        displayName,
      },
    });
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
