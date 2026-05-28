import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { DatabaseService } from '../database/database.service';
import { TagsService } from '../tags/tags.service';
import { PendingOwnershipService } from '../pending-ownership/pending-ownership.service';
import { DiscordService } from '../discord/discord.service';
import { DeviantArtService } from '../deviantart/deviantart.service';
import { PermissionService } from '../auth/PermissionService';
import { TraitReviewService } from '../trait-review/trait-review.service';
import { ModerationStatus, TraitValueType, Visibility } from '@chardb/database';
import { mockDatabaseService } from '../../test/setup';

const mockTagsService = { getCharacterTags: jest.fn(), getCharacterTagRelations: jest.fn(), findOrCreateTags: jest.fn() };
const mockPendingOwnershipService = { findByCharacterId: jest.fn(), createForCharacter: jest.fn(), remove: jest.fn() };
const mockDiscordService = { validateUserId: jest.fn(), resolveUsernameToId: jest.fn() };
const mockDeviantArtService = { resolveUsername: jest.fn() };
const mockPermissionService = { hasCommunityPermission: jest.fn(), getCommunityPermissions: jest.fn() };
const mockTraitReviewService = { createReview: jest.fn() };

const makeCharacter = (overrides: Record<string, unknown> = {}) => ({
  id: 'char1',
  name: 'Test Character',
  visibility: Visibility.PUBLIC,
  ownerId: 'user1',
  creatorId: 'user1',
  speciesId: null,
  speciesVariantId: null,
  registryId: null,
  customFields: {},
  traitValues: [],
  traitReviewStatus: null,
  deletedAt: null,
  deletedById: null,
  mainMediaId: null,
  isSellable: false,
  isTradeable: false,
  price: null,
  details: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('CharactersService', () => {
  let service: CharactersService;
  let db: typeof mockDatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CharactersService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: TagsService, useValue: mockTagsService },
        { provide: PendingOwnershipService, useValue: mockPendingOwnershipService },
        { provide: DiscordService, useValue: mockDiscordService },
        { provide: DeviantArtService, useValue: mockDeviantArtService },
        { provide: PermissionService, useValue: mockPermissionService },
        { provide: TraitReviewService, useValue: mockTraitReviewService },
      ],
    }).compile();

    service = module.get<CharactersService>(CharactersService);
    db = module.get<DatabaseService>(DatabaseService) as unknown as typeof mockDatabaseService;
  });

  describe('findOne', () => {
    it('should find a public character', async () => {
      const character = makeCharacter();
      db.character.findFirst.mockResolvedValue(character);

      const result = await service.findOne('char1');

      expect(db.character.findFirst).toHaveBeenCalledWith({
        where: { id: 'char1', deletedAt: null },
      });
      expect(result).toEqual(character);
    });

    it('should throw NotFoundException for a non-existent character', async () => {
      db.character.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for a soft-deleted character', async () => {
      db.character.findFirst.mockResolvedValue(null);

      await expect(service.findOne('char1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for private character accessed by non-owner', async () => {
      const character = makeCharacter({ visibility: Visibility.PRIVATE });
      db.character.findFirst.mockResolvedValue(character);

      await expect(service.findOne('char1', 'user2')).rejects.toThrow();
    });

    it('should allow owner to access private character', async () => {
      const character = makeCharacter({ visibility: Visibility.PRIVATE });
      db.character.findFirst.mockResolvedValue(character);

      const result = await service.findOne('char1', 'user1');
      expect(result).toEqual(character);
    });
  });

  describe('findAll', () => {
    it('should include notDeleted filter in the where clause', async () => {
      const mockCharacters = [makeCharacter(), makeCharacter({ id: 'char2', name: 'Character 2' })];
      db.character.findMany.mockResolvedValue(mockCharacters);
      db.character.count.mockResolvedValue(2);

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result).toEqual({
        characters: mockCharacters,
        total: 2,
        hasMore: false,
      });

      expect(db.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([{ deletedAt: null }]),
          }),
        }),
      );
    });

    it('should not include soft-deleted characters', async () => {
      db.character.findMany.mockResolvedValue([]);
      db.character.count.mockResolvedValue(0);

      await service.findAll();

      const [call] = db.character.findMany.mock.calls;
      const where = call[0].where;
      expect(where.AND).toEqual(expect.arrayContaining([{ deletedAt: null }]));
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt and cancel pending trait reviews', async () => {
      const character = makeCharacter();
      db.character.findFirst.mockResolvedValue(character);
      db.character.update.mockResolvedValue({ ...character, deletedAt: new Date(), deletedById: 'admin1' });
      db.traitReview.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.softDelete('char1', 'admin1');

      expect(result).toBe(true);
      expect(db.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'char1' },
          data: expect.objectContaining({
            deletedById: 'admin1',
          }),
        }),
      );
      expect(db.traitReview.updateMany).toHaveBeenCalledWith({
        where: { characterId: 'char1', status: ModerationStatus.PENDING },
        data: { status: ModerationStatus.CANCELLED },
      });
    });

    it('should throw NotFoundException for a non-existent character', async () => {
      db.character.findFirst.mockResolvedValue(null);

      await expect(service.softDelete('nonexistent', 'admin1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for an already soft-deleted character', async () => {
      db.character.findFirst.mockResolvedValue(null);

      await expect(service.softDelete('char1', 'admin1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('purge', () => {
    it('should hard-delete the character', async () => {
      const character = makeCharacter();
      db.character.findFirst.mockResolvedValue(character);
      db.character.delete.mockResolvedValue(character);

      const result = await service.purge('char1');

      expect(result).toBe(true);
      expect(db.character.delete).toHaveBeenCalledWith({ where: { id: 'char1' } });
    });

    it('should throw NotFoundException when character does not exist', async () => {
      db.character.findFirst.mockResolvedValue(null);

      await expect(service.purge('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should purge a soft-deleted character (findFirst without notDeleted filter)', async () => {
      const character = makeCharacter({ deletedAt: new Date(), deletedById: 'admin1' });
      db.character.findFirst.mockResolvedValue(character);
      db.character.delete.mockResolvedValue(character);

      const result = await service.purge('char1');
      expect(result).toBe(true);
    });
  });

  describe('kickFromSpecies', () => {
    it('should throw NotFoundException when character does not exist', async () => {
      db.character.findFirst.mockResolvedValue(null);

      await expect(service.kickFromSpecies('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when character has no species', async () => {
      const character = makeCharacter({ speciesId: null });
      db.character.findFirst.mockResolvedValue(character);

      await expect(service.kickFromSpecies('char1')).rejects.toThrow(BadRequestException);
    });

    it('should nullify speciesId, speciesVariantId, registryId and clear traitValues', async () => {
      const character = makeCharacter({
        speciesId: 'species1',
        speciesVariantId: 'variant1',
        registryId: '001',
        traitValues: [],
        customFields: {},
      });
      db.character.findFirst.mockResolvedValue(character);
      db.trait.findMany.mockResolvedValue([]);
      db.enumValue.findMany.mockResolvedValue([]);
      db.character.update.mockResolvedValue({ ...character, speciesId: null });
      db.traitReview.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.kickFromSpecies('char1');

      expect(result).toBe(true);
      expect(db.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'char1' },
          data: expect.objectContaining({
            speciesId: null,
            speciesVariantId: null,
            registryId: null,
            traitValues: [],
          }),
        }),
      );
    });

    it('should cancel pending trait reviews', async () => {
      const character = makeCharacter({ speciesId: 'species1', traitValues: [] });
      db.character.findFirst.mockResolvedValue(character);
      db.trait.findMany.mockResolvedValue([]);
      db.enumValue.findMany.mockResolvedValue([]);
      db.character.update.mockResolvedValue(character);
      db.traitReview.updateMany.mockResolvedValue({ count: 1 });

      await service.kickFromSpecies('char1');

      expect(db.traitReview.updateMany).toHaveBeenCalledWith({
        where: { characterId: 'char1', status: ModerationStatus.PENDING },
        data: { status: ModerationStatus.CANCELLED },
      });
    });

    it('should flatten string trait values into customFields', async () => {
      const traitValues = [{ traitId: 'trait1', value: 'Blue', clarifier: null }];
      const character = makeCharacter({
        speciesId: 'species1',
        traitValues,
        customFields: { 'Existing Field': 'kept' },
      });
      db.character.findFirst.mockResolvedValue(character);
      db.trait.findMany.mockResolvedValue([
        { id: 'trait1', name: 'Eye Color', valueType: TraitValueType.STRING },
      ]);
      db.enumValue.findMany.mockResolvedValue([]);
      db.character.update.mockResolvedValue(character);
      db.traitReview.updateMany.mockResolvedValue({ count: 0 });

      await service.kickFromSpecies('char1');

      expect(db.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customFields: expect.objectContaining({
              'Eye Color': 'Blue',
              'Existing Field': 'kept',
            }),
          }),
        }),
      );
    });

    it('should append clarifier to the display value', async () => {
      const traitValues = [{ traitId: 'trait1', value: 'Blue', clarifier: 'gradient' }];
      const character = makeCharacter({ speciesId: 'species1', traitValues, customFields: {} });
      db.character.findFirst.mockResolvedValue(character);
      db.trait.findMany.mockResolvedValue([
        { id: 'trait1', name: 'Eye Color', valueType: TraitValueType.STRING },
      ]);
      db.enumValue.findMany.mockResolvedValue([]);
      db.character.update.mockResolvedValue(character);
      db.traitReview.updateMany.mockResolvedValue({ count: 0 });

      await service.kickFromSpecies('char1');

      expect(db.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customFields: expect.objectContaining({
              'Eye Color': 'Blue (gradient)',
            }),
          }),
        }),
      );
    });

    it('should resolve ENUM trait values to their display names', async () => {
      const traitValues = [{ traitId: 'trait1', value: 'spotted', clarifier: null }];
      const character = makeCharacter({ speciesId: 'species1', traitValues, customFields: {} });
      db.character.findFirst.mockResolvedValue(character);
      db.trait.findMany.mockResolvedValue([
        { id: 'trait1', name: 'Pattern', valueType: TraitValueType.ENUM },
      ]);
      db.enumValue.findMany.mockResolvedValue([
        { id: 'ev1', traitId: 'trait1', name: 'Spotted' },
      ]);
      db.character.update.mockResolvedValue(character);
      db.traitReview.updateMany.mockResolvedValue({ count: 0 });

      await service.kickFromSpecies('char1');

      expect(db.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customFields: expect.objectContaining({
              Pattern: 'Spotted',
            }),
          }),
        }),
      );
    });

    it('should resolve ENUM trait values stored as UUIDs to their display names', async () => {
      const traitValues = [{ traitId: 'trait1', value: 'ev-uuid-123', clarifier: null }];
      const character = makeCharacter({ speciesId: 'species1', traitValues, customFields: {} });
      db.character.findFirst.mockResolvedValue(character);
      db.trait.findMany.mockResolvedValue([
        { id: 'trait1', name: 'Pattern', valueType: TraitValueType.ENUM },
      ]);
      db.enumValue.findMany.mockResolvedValue([
        { id: 'ev-uuid-123', traitId: 'trait1', name: 'Spotted' },
      ]);
      db.character.update.mockResolvedValue(character);
      db.traitReview.updateMany.mockResolvedValue({ count: 0 });

      await service.kickFromSpecies('char1');

      expect(db.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customFields: expect.objectContaining({
              Pattern: 'Spotted',
            }),
          }),
        }),
      );
    });

    it('should concatenate multiple values for the same trait', async () => {
      const traitValues = [
        { traitId: 'trait1', value: 'Red', clarifier: null },
        { traitId: 'trait1', value: 'Blue', clarifier: null },
      ];
      const character = makeCharacter({ speciesId: 'species1', traitValues, customFields: {} });
      db.character.findFirst.mockResolvedValue(character);
      db.trait.findMany.mockResolvedValue([
        { id: 'trait1', name: 'Colors', valueType: TraitValueType.STRING },
      ]);
      db.enumValue.findMany.mockResolvedValue([]);
      db.character.update.mockResolvedValue(character);
      db.traitReview.updateMany.mockResolvedValue({ count: 0 });

      await service.kickFromSpecies('char1');

      expect(db.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customFields: expect.objectContaining({
              Colors: 'Red, Blue',
            }),
          }),
        }),
      );
    });
  });
});
