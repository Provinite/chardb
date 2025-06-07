import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GalleriesService } from './galleries.service';
import { DatabaseService } from '../database/database.service';
import { Visibility } from '@prisma/client';
import { mockDatabaseService } from '../../test/setup';

describe('GalleriesService', () => {
  let service: GalleriesService;
  let db: typeof mockDatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GalleriesService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<GalleriesService>(GalleriesService);
    db = module.get<DatabaseService>(DatabaseService) as any;
  });

  describe('create', () => {
    it('should create a gallery successfully', async () => {
      const userId = 'user1';
      const input = {
        name: 'Test Gallery',
        description: 'A test gallery',
        visibility: Visibility.PUBLIC,
        sortOrder: 0,
      };

      const mockGallery = {
        id: 'gallery1',
        ...input,
        ownerId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: userId, username: 'testuser' },
        character: null,
        images: [],
      };

      db.gallery.create.mockResolvedValue(mockGallery);

      const result = await service.create(userId, input);

      expect(db.gallery.create).toHaveBeenCalledWith({
        data: {
          ...input,
          ownerId: userId,
        },
        include: {
          owner: true,
          character: true,
          images: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
      expect(result).toEqual(mockGallery);
    });

    it('should verify character ownership when specified', async () => {
      const userId = 'user1';
      const input = {
        name: 'Character Gallery',
        characterId: 'char1',
      };

      db.character.findUnique.mockResolvedValue({
        id: 'char1',
        ownerId: 'user2', // Different user
      });

      await expect(service.create(userId, input))
        .rejects.toThrow(ForbiddenException);

      expect(db.character.findUnique).toHaveBeenCalledWith({
        where: { id: 'char1' },
        select: { ownerId: true },
      });
    });
  });

  describe('findOne', () => {
    it('should find a public gallery', async () => {
      const galleryId = 'gallery1';
      const mockGallery = {
        id: galleryId,
        name: 'Public Gallery',
        visibility: Visibility.PUBLIC,
        ownerId: 'user1',
      };

      db.gallery.findUnique.mockResolvedValue(mockGallery);

      const result = await service.findOne(galleryId);

      expect(db.gallery.findUnique).toHaveBeenCalledWith({
        where: { id: galleryId },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockGallery);
    });

    it('should throw NotFoundException for non-existent gallery', async () => {
      const galleryId = 'nonexistent';
      db.gallery.findUnique.mockResolvedValue(null);

      await expect(service.findOne(galleryId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for private gallery accessed by non-owner', async () => {
      const galleryId = 'gallery1';
      const mockGallery = {
        id: galleryId,
        name: 'Private Gallery',
        visibility: Visibility.PRIVATE,
        ownerId: 'user1',
      };

      db.gallery.findUnique.mockResolvedValue(mockGallery);

      await expect(service.findOne(galleryId, 'user2')).rejects.toThrow(ForbiddenException);
    });

    it('should allow owner to access private gallery', async () => {
      const galleryId = 'gallery1';
      const mockGallery = {
        id: galleryId,
        name: 'Private Gallery',
        visibility: Visibility.PRIVATE,
        ownerId: 'user1',
      };

      db.gallery.findUnique.mockResolvedValue(mockGallery);

      const result = await service.findOne(galleryId, 'user1');
      expect(result).toEqual(mockGallery);
    });
  });

  describe('update', () => {
    it('should update gallery successfully', async () => {
      const galleryId = 'gallery1';
      const userId = 'user1';
      const input = { name: 'Updated Gallery' };

      const mockExistingGallery = {
        id: galleryId,
        ownerId: userId,
        visibility: Visibility.PUBLIC,
      };

      const mockUpdatedGallery = {
        ...mockExistingGallery,
        ...input,
      };

      db.gallery.findUnique.mockResolvedValue(mockExistingGallery);
      db.gallery.update.mockResolvedValue(mockUpdatedGallery);

      const result = await service.update(galleryId, userId, input);

      expect(db.gallery.update).toHaveBeenCalledWith({
        where: { id: galleryId },
        data: input,
        include: expect.any(Object),
      });
      expect(result).toEqual(mockUpdatedGallery);
    });

    it('should throw ForbiddenException when non-owner tries to update', async () => {
      const galleryId = 'gallery1';
      const mockGallery = {
        id: galleryId,
        ownerId: 'user1',
        visibility: Visibility.PUBLIC,
      };

      db.gallery.findUnique.mockResolvedValue(mockGallery);

      await expect(service.update(galleryId, 'user2', { name: 'Hacked' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('should verify new character ownership when changing character', async () => {
      const galleryId = 'gallery1';
      const userId = 'user1';
      const input = { characterId: 'char2' };

      const mockExistingGallery = {
        id: galleryId,
        ownerId: userId,
        characterId: 'char1',
      };

      db.gallery.findUnique.mockResolvedValue(mockExistingGallery);
      db.character.findUnique.mockResolvedValue({
        id: 'char2',
        ownerId: 'user2', // Different user
      });

      await expect(service.update(galleryId, userId, input))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete gallery successfully', async () => {
      const galleryId = 'gallery1';
      const userId = 'user1';

      const mockGallery = {
        id: galleryId,
        ownerId: userId,
        visibility: Visibility.PUBLIC,
      };

      db.gallery.findUnique.mockResolvedValue(mockGallery);
      db.gallery.delete.mockResolvedValue(mockGallery);

      const result = await service.remove(galleryId, userId);

      expect(db.gallery.delete).toHaveBeenCalledWith({
        where: { id: galleryId },
      });
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when non-owner tries to delete', async () => {
      const galleryId = 'gallery1';
      const mockGallery = {
        id: galleryId,
        ownerId: 'user1',
        visibility: Visibility.PUBLIC,
      };

      db.gallery.findUnique.mockResolvedValue(mockGallery);

      await expect(service.remove(galleryId, 'user2'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return paginated galleries with proper filtering', async () => {
      const mockGalleries = [
        { id: 'gallery1', name: 'Gallery 1', visibility: Visibility.PUBLIC },
        { id: 'gallery2', name: 'Gallery 2', visibility: Visibility.PUBLIC },
      ];

      db.gallery.findMany.mockResolvedValue(mockGalleries);
      db.gallery.count.mockResolvedValue(2);

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result).toEqual({
        galleries: mockGalleries,
        total: 2,
        hasMore: false,
      });

      expect(db.gallery.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        take: 10,
        skip: 0,
      });
    });

    it('should filter by character when specified', async () => {
      const characterId = 'char1';
      const filters = { characterId, limit: 10, offset: 0 };

      db.gallery.findMany.mockResolvedValue([]);
      db.gallery.count.mockResolvedValue(0);

      await service.findAll(filters);

      expect(db.gallery.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { characterId },
          ]),
        }),
        include: expect.any(Object),
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        take: 10,
        skip: 0,
      });
    });
  });

  describe('addImage', () => {
    it('should add image to gallery successfully', async () => {
      const galleryId = 'gallery1';
      const imageId = 'img1';
      const userId = 'user1';

      const mockGallery = {
        id: galleryId,
        ownerId: userId,
        visibility: Visibility.PUBLIC,
      };

      const mockImage = {
        id: imageId,
        uploaderId: userId,
        galleryId: null,
      };

      const mockUpdatedGallery = {
        ...mockGallery,
        images: [{ ...mockImage, galleryId }],
      };

      db.gallery.findUnique.mockResolvedValue(mockGallery);
      db.image.findUnique.mockResolvedValue(mockImage);
      db.image.update.mockResolvedValue({ ...mockImage, galleryId });

      // Mock the findOne call for returning updated gallery
      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue(mockUpdatedGallery as any);

      const result = await service.addImage(galleryId, imageId, userId);

      expect(db.image.update).toHaveBeenCalledWith({
        where: { id: imageId },
        data: { galleryId },
      });
      expect(findOneSpy).toHaveBeenCalledWith(galleryId, userId);
      expect(result).toEqual(mockUpdatedGallery);

      findOneSpy.mockRestore();
    });

    it('should throw ForbiddenException when non-owner tries to add image', async () => {
      const galleryId = 'gallery1';
      const imageId = 'img1';
      const userId = 'user2';

      const mockGallery = {
        id: galleryId,
        ownerId: 'user1', // Different user
        visibility: Visibility.PUBLIC,
      };

      const mockImage = {
        id: imageId,
        uploaderId: 'user2',
        galleryId: null,
      };

      db.gallery.findUnique.mockResolvedValue(mockGallery);
      db.image.findUnique.mockResolvedValue(mockImage);

      await expect(service.addImage(galleryId, imageId, userId))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when trying to add someone elses image', async () => {
      const galleryId = 'gallery1';
      const imageId = 'img1';
      const userId = 'user1';

      const mockGallery = {
        id: galleryId,
        ownerId: userId,
        visibility: Visibility.PUBLIC,
      };

      const mockImage = {
        id: imageId,
        uploaderId: 'user2', // Different user
        galleryId: null,
      };

      db.gallery.findUnique.mockResolvedValue(mockGallery);
      db.image.findUnique.mockResolvedValue(mockImage);

      await expect(service.addImage(galleryId, imageId, userId))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when image is already in gallery', async () => {
      const galleryId = 'gallery1';
      const imageId = 'img1';
      const userId = 'user1';

      const mockGallery = {
        id: galleryId,
        ownerId: userId,
        visibility: Visibility.PUBLIC,
      };

      const mockImage = {
        id: imageId,
        uploaderId: userId,
        galleryId: galleryId, // Already in this gallery
      };

      db.gallery.findUnique.mockResolvedValue(mockGallery);
      db.image.findUnique.mockResolvedValue(mockImage);

      await expect(service.addImage(galleryId, imageId, userId))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('reorderGalleries', () => {
    it('should reorder galleries successfully', async () => {
      const userId = 'user1';
      const galleryIds = ['gallery1', 'gallery2', 'gallery3'];

      const mockGalleries = galleryIds.map((id, index) => ({
        id,
        ownerId: userId,
        sortOrder: index,
      }));

      const mockReorderedGalleries = galleryIds.map((id, index) => ({
        id,
        ownerId: userId,
        sortOrder: index,
        owner: { id: userId, username: 'testuser' },
        character: null,
        _count: { images: 0 },
      }));

      db.gallery.findMany.mockResolvedValueOnce(mockGalleries).mockResolvedValueOnce(mockReorderedGalleries);
      db.gallery.update.mockResolvedValue({});

      const result = await service.reorderGalleries(userId, galleryIds);

      expect(db.gallery.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: galleryIds },
          ownerId: userId,
        },
      });

      expect(db.gallery.update).toHaveBeenCalledTimes(3);
      galleryIds.forEach((id, index) => {
        expect(db.gallery.update).toHaveBeenCalledWith({
          where: { id },
          data: { sortOrder: index },
        });
      });

      expect(result).toEqual(mockReorderedGalleries);
    });

    it('should throw ForbiddenException when some galleries do not belong to user', async () => {
      const userId = 'user1';
      const galleryIds = ['gallery1', 'gallery2', 'gallery3'];

      // Only return 2 galleries instead of 3
      const mockGalleries = [
        { id: 'gallery1', ownerId: userId },
        { id: 'gallery2', ownerId: userId },
      ];

      db.gallery.findMany.mockResolvedValue(mockGalleries);

      await expect(service.reorderGalleries(userId, galleryIds))
        .rejects.toThrow(ForbiddenException);
    });
  });
});