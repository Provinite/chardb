import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { DatabaseService } from '../database/database.service';
import { Visibility } from '@prisma/client';
import { mockDatabaseService } from '../../test/setup';

describe('CharactersService', () => {
  let service: CharactersService;
  let db: typeof mockDatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CharactersService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<CharactersService>(CharactersService);
    db = module.get<DatabaseService>(DatabaseService) as any;
  });

  describe('create', () => {
    it('should create a character successfully', async () => {
      const userId = 'user1';
      const input = {
        name: 'Test Character',
        species: 'Dragon',
        description: 'A test character',
        visibility: Visibility.PUBLIC,
      };

      const mockCharacter = {
        id: 'char1',
        ...input,
        customFields: null,
        ownerId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: userId, username: 'testuser' },
        tags: [],
        _count: { images: 0, galleries: 0 },
      };

      db.character.create.mockResolvedValue(mockCharacter);

      const result = await service.create(userId, input);

      expect(db.character.create).toHaveBeenCalledWith({
        data: {
          ...input,
          ownerId: userId,
          creatorId: userId,
        },
        include: {
          owner: true,
          creator: true,
          tags_rel: {
            include: {
              tag: true,
            },
          },
        },
      });
      expect(result).toEqual(mockCharacter);
    });
  });

  describe('findOne', () => {
    it('should find a public character', async () => {
      const characterId = 'char1';
      const mockCharacter = {
        id: characterId,
        name: 'Public Character',
        visibility: Visibility.PUBLIC,
        ownerId: 'user1',
        customFields: null,
      };

      db.character.findUnique.mockResolvedValue(mockCharacter);

      const result = await service.findOne(characterId);

      expect(db.character.findUnique).toHaveBeenCalledWith({
        where: { id: characterId },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockCharacter);
    });

    it('should throw NotFoundException for non-existent character', async () => {
      const characterId = 'nonexistent';
      db.character.findUnique.mockResolvedValue(null);

      await expect(service.findOne(characterId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for private character accessed by non-owner', async () => {
      const characterId = 'char1';
      const mockCharacter = {
        id: characterId,
        name: 'Private Character',
        visibility: Visibility.PRIVATE,
        ownerId: 'user1',
        customFields: null,
      };

      db.character.findUnique.mockResolvedValue(mockCharacter);

      await expect(service.findOne(characterId, 'user2')).rejects.toThrow(ForbiddenException);
    });

    it('should allow owner to access private character', async () => {
      const characterId = 'char1';
      const mockCharacter = {
        id: characterId,
        name: 'Private Character',
        visibility: Visibility.PRIVATE,
        ownerId: 'user1',
        customFields: null,
      };

      db.character.findUnique.mockResolvedValue(mockCharacter);

      const result = await service.findOne(characterId, 'user1');
      expect(result).toEqual(mockCharacter);
    });
  });

  describe('update', () => {
    it('should update character successfully', async () => {
      const characterId = 'char1';
      const userId = 'user1';
      const input = { name: 'Updated Character' };

      const mockExistingCharacter = {
        id: characterId,
        ownerId: userId,
        visibility: Visibility.PUBLIC,
      };

      const mockUpdatedCharacter = {
        ...mockExistingCharacter,
        ...input,
        customFields: null,
      };

      db.character.findUnique.mockResolvedValue(mockExistingCharacter);
      db.character.update.mockResolvedValue(mockUpdatedCharacter);

      const result = await service.update(characterId, userId, input);

      expect(db.character.update).toHaveBeenCalledWith({
        where: { id: characterId },
        data: input,
        include: expect.any(Object),
      });
      expect(result).toEqual(mockUpdatedCharacter);
    });

    it('should throw ForbiddenException when non-owner tries to update', async () => {
      const characterId = 'char1';
      const mockCharacter = {
        id: characterId,
        ownerId: 'user1',
        visibility: Visibility.PUBLIC,
      };

      db.character.findUnique.mockResolvedValue(mockCharacter);

      await expect(service.update(characterId, 'user2', { name: 'Hacked' }))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete character successfully', async () => {
      const characterId = 'char1';
      const userId = 'user1';

      const mockCharacter = {
        id: characterId,
        ownerId: userId,
        visibility: Visibility.PUBLIC,
      };

      db.character.findUnique.mockResolvedValue(mockCharacter);
      db.character.delete.mockResolvedValue(mockCharacter);

      const result = await service.remove(characterId, userId);

      expect(db.character.delete).toHaveBeenCalledWith({
        where: { id: characterId },
      });
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when non-owner tries to delete', async () => {
      const characterId = 'char1';
      const mockCharacter = {
        id: characterId,
        ownerId: 'user1',
        visibility: Visibility.PUBLIC,
      };

      db.character.findUnique.mockResolvedValue(mockCharacter);

      await expect(service.remove(characterId, 'user2'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return paginated characters with proper filtering', async () => {
      const mockCharacters = [
        { id: 'char1', name: 'Character 1', visibility: Visibility.PUBLIC, customFields: null },
        { id: 'char2', name: 'Character 2', visibility: Visibility.PUBLIC, customFields: null },
      ];

      db.character.findMany.mockResolvedValue(mockCharacters);
      db.character.count.mockResolvedValue(2);

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result).toEqual({
        characters: mockCharacters,
        total: 2,
        hasMore: false,
      });

      expect(db.character.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { visibility: Visibility.PUBLIC },
          ]),
        }),
        include: {
          owner: true,
          creator: true,
          tags_rel: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              images: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      });
    });
  });

  describe('addTags', () => {
    it('should add tags to character', async () => {
      const characterId = 'char1';
      const userId = 'user1';
      const tagNames = ['fantasy', 'dragon'];

      const mockCharacter = {
        id: characterId,
        ownerId: userId,
        visibility: Visibility.PUBLIC,
      };

      const mockTags = [
        { id: 'tag1', name: 'fantasy' },
        { id: 'tag2', name: 'dragon' },
      ];

      const mockUpdatedCharacter = {
        ...mockCharacter,
        customFields: null,
      };

      db.character.findUnique.mockResolvedValue(mockCharacter);
      db.tag.upsert.mockResolvedValueOnce(mockTags[0]).mockResolvedValueOnce(mockTags[1]);
      db.characterTag.upsert.mockResolvedValue({});
      db.character.findUnique.mockResolvedValueOnce(mockUpdatedCharacter);

      const result = await service.addTags(characterId, userId, tagNames);

      expect(db.tag.upsert).toHaveBeenCalledTimes(2);
      expect(db.characterTag.upsert).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockUpdatedCharacter);
    });
  });
});