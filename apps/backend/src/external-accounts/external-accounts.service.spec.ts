import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ExternalAccountsService } from './external-accounts.service';
import { DatabaseService } from '../database/database.service';
import { ExternalAccountProvider } from '@prisma/client';
import { mockDatabaseService } from '../../test/setup';

describe('ExternalAccountsService', () => {
  let service: ExternalAccountsService;
  let db: typeof mockDatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalAccountsService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<ExternalAccountsService>(ExternalAccountsService);
    db = module.get<DatabaseService>(DatabaseService) as any;
  });

  describe('findByUserId', () => {
    it('should find all external accounts for a user', async () => {
      const userId = 'user1';
      const mockAccounts = [
        {
          id: 'account1',
          userId,
          provider: ExternalAccountProvider.DEVIANTART,
          providerAccountId: 'da123',
          displayName: 'testuser',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
      ];

      db.externalAccount.findMany.mockResolvedValue(mockAccounts);

      const result = await service.findByUserId(userId);

      expect(db.externalAccount.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockAccounts);
    });

    it('should return empty array when user has no linked accounts', async () => {
      const userId = 'user1';
      db.externalAccount.findMany.mockResolvedValue([]);

      const result = await service.findByUserId(userId);

      expect(result).toEqual([]);
    });
  });

  describe('findByProviderAndUserId', () => {
    it('should find an external account by provider and user ID', async () => {
      const userId = 'user1';
      const provider = ExternalAccountProvider.DEVIANTART;
      const mockAccount = {
        id: 'account1',
        userId,
        provider,
        providerAccountId: 'da123',
        displayName: 'testuser',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      db.externalAccount.findUnique.mockResolvedValue(mockAccount);

      const result = await service.findByProviderAndUserId(provider, userId);

      expect(db.externalAccount.findUnique).toHaveBeenCalledWith({
        where: {
          provider_userId: {
            provider,
            userId,
          },
        },
      });
      expect(result).toEqual(mockAccount);
    });

    it('should return null when no account is found', async () => {
      const userId = 'user1';
      const provider = ExternalAccountProvider.DEVIANTART;

      db.externalAccount.findUnique.mockResolvedValue(null);

      const result = await service.findByProviderAndUserId(provider, userId);

      expect(result).toBeNull();
    });
  });

  describe('linkExternalAccount', () => {
    it('should link an external account successfully', async () => {
      const userId = 'user1';
      const provider = ExternalAccountProvider.DEVIANTART;
      const providerAccountId = 'da123';
      const displayName = 'testuser';

      const mockLinkedAccount = {
        id: 'account1',
        userId,
        provider,
        providerAccountId,
        displayName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock that this provider account is not linked to anyone
      db.externalAccount.findUnique
        .mockResolvedValueOnce(null)  // First check: provider account not linked
        .mockResolvedValueOnce(null); // Second check (via findByProviderAndUserId): user doesn't have provider linked

      db.externalAccount.create.mockResolvedValue(mockLinkedAccount);

      const result = await service.linkExternalAccount(
        userId,
        provider,
        providerAccountId,
        displayName,
      );

      expect(db.externalAccount.findUnique).toHaveBeenNthCalledWith(1, {
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId,
          },
        },
      });

      expect(db.externalAccount.findUnique).toHaveBeenNthCalledWith(2, {
        where: {
          provider_userId: {
            provider,
            userId,
          },
        },
      });

      expect(db.externalAccount.create).toHaveBeenCalledWith({
        data: {
          userId,
          provider,
          providerAccountId,
          displayName,
        },
      });

      expect(result).toEqual(mockLinkedAccount);
    });

    it('should throw ConflictException when provider account is already linked to same user', async () => {
      const userId = 'user1';
      const provider = ExternalAccountProvider.DEVIANTART;
      const providerAccountId = 'da123';
      const displayName = 'testuser';

      const existingAccount = {
        id: 'account1',
        userId, // Same user
        provider,
        providerAccountId,
        displayName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      db.externalAccount.findUnique.mockResolvedValue(existingAccount);

      await expect(
        service.linkExternalAccount(userId, provider, providerAccountId, displayName),
      ).rejects.toThrow(
        new ConflictException('This account is already linked to your profile'),
      );

      expect(db.externalAccount.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when provider account is already linked to different user', async () => {
      const userId = 'user1';
      const provider = ExternalAccountProvider.DEVIANTART;
      const providerAccountId = 'da123';
      const displayName = 'testuser';

      const existingAccount = {
        id: 'account1',
        userId: 'user2', // Different user
        provider,
        providerAccountId,
        displayName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      db.externalAccount.findUnique.mockResolvedValue(existingAccount);

      await expect(
        service.linkExternalAccount(userId, provider, providerAccountId, displayName),
      ).rejects.toThrow(
        new ConflictException('This external account is already linked to another user'),
      );

      expect(db.externalAccount.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when user already has an account linked for this provider', async () => {
      const userId = 'user1';
      const provider = ExternalAccountProvider.DEVIANTART;
      const providerAccountId = 'da123';
      const displayName = 'testuser';

      const existingUserLink = {
        id: 'account1',
        userId,
        provider,
        providerAccountId: 'da456', // Different provider account ID
        displayName: 'olduser',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      db.externalAccount.findUnique
        .mockResolvedValueOnce(null)  // First check: provider account not linked to anyone
        .mockResolvedValueOnce(existingUserLink); // Second check: user already has this provider

      await expect(
        service.linkExternalAccount(userId, provider, providerAccountId, displayName),
      ).rejects.toThrow(
        new ConflictException(
          `You already have a ${provider} account linked. Please unlink it first.`,
        ),
      );

      expect(db.externalAccount.create).not.toHaveBeenCalled();
    });
  });

  describe('unlinkExternalAccount', () => {
    it('should unlink an external account successfully', async () => {
      const userId = 'user1';
      const provider = ExternalAccountProvider.DEVIANTART;

      const existingAccount = {
        id: 'account1',
        userId,
        provider,
        providerAccountId: 'da123',
        displayName: 'testuser',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      db.externalAccount.findUnique.mockResolvedValue(existingAccount);
      db.externalAccount.delete.mockResolvedValue(existingAccount);

      const result = await service.unlinkExternalAccount(userId, provider);

      expect(db.externalAccount.findUnique).toHaveBeenCalledWith({
        where: {
          provider_userId: {
            provider,
            userId,
          },
        },
      });

      expect(db.externalAccount.delete).toHaveBeenCalledWith({
        where: { id: existingAccount.id },
      });

      expect(result).toBe(true);
    });

    it('should throw NotFoundException when no account is found to unlink', async () => {
      const userId = 'user1';
      const provider = ExternalAccountProvider.DEVIANTART;

      db.externalAccount.findUnique.mockResolvedValue(null);

      await expect(service.unlinkExternalAccount(userId, provider)).rejects.toThrow(
        new NotFoundException(`No ${provider} account found linked to your profile`),
      );

      expect(db.externalAccount.delete).not.toHaveBeenCalled();
    });
  });
});
