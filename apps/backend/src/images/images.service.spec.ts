import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ImagesService } from './images.service';
import { DatabaseService } from '../database/database.service';
import { Visibility } from '@prisma/client';
import { mockDatabaseService } from '../../test/setup';

// Mock Sharp
jest.mock('sharp', () => {
  return jest.fn(() => ({
    metadata: jest.fn().mockResolvedValue({
      width: 1000,
      height: 800,
      format: 'jpeg',
      size: 500000,
    }),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image')),
  }));
});

describe('ImagesService', () => {
  let service: ImagesService;
  let db: typeof mockDatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImagesService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<ImagesService>(ImagesService);
    db = module.get<DatabaseService>(DatabaseService) as any;
  });

  describe('create', () => {
    const mockFile = {
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      size: 500000,
      buffer: Buffer.from('test-image-data'),
    } as Express.Multer.File;

    it('should create an image successfully', async () => {
      const userId = 'user1';
      const input = {
        description: 'Test image',
        visibility: Visibility.PUBLIC,
      };

      const mockImage = {
        id: 'img1',
        originalName: 'test.jpg',
        fileName: expect.any(String),
        mimeType: 'image/jpeg',
        fileSize: 500000,
        ...input,
        uploaderId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        uploader: { id: userId, username: 'testuser' },
        tags: [],
        _count: { comments: 0, likes: 0 },
      };

      db.image.create.mockResolvedValue(mockImage);

      const result = await service.upload(userId, { file: mockFile, ...input });

      expect(db.image.create).toHaveBeenCalledWith({
        data: {
          filename: expect.any(String),
          originalFilename: 'test.jpg',
          url: expect.any(String),
          thumbnailUrl: expect.any(String),
          altText: undefined,
          artistId: undefined,
          artistName: undefined,
          artistUrl: undefined,
          source: undefined,
          mimeType: 'image/jpeg',
          fileSize: 500000,
          width: expect.any(Number),
          height: expect.any(Number),
          uploaderId: userId,
          characterId: undefined,
          galleryId: undefined,
          isNsfw: false,
          ...input,
        },
        include: {
          uploader: true,
          artist: true,
          character: true,
          gallery: true,
          tags_rel: {
            include: {
              tag: true,
            },
          },
        },
      });
      expect(result).toEqual(mockImage);
    });

    it('should reject invalid file types', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'text/plain',
      } as Express.Multer.File;

      await expect(service.upload('user1', { file: invalidFile }))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject files that are too large', async () => {
      const largeFile = {
        ...mockFile,
        size: 15 * 1024 * 1024, // 15MB
      } as Express.Multer.File;

      await expect(service.upload('user1', { file: largeFile }))
        .rejects.toThrow(BadRequestException);
    });

    it('should verify character ownership when specified', async () => {
      const input = { characterId: 'char1' };
      
      db.character.findUnique.mockResolvedValue({
        id: 'char1',
        ownerId: 'user2', // Different user
      });

      await expect(service.upload('user1', { file: mockFile, ...input }))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should find a public image', async () => {
      const imageId = 'img1';
      const mockImage = {
        id: imageId,
        description: 'Public image',
        visibility: Visibility.PUBLIC,
        uploaderId: 'user1',
      };

      db.image.findUnique.mockResolvedValue(mockImage);

      const result = await service.findOne(imageId);

      expect(db.image.findUnique).toHaveBeenCalledWith({
        where: { id: imageId },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockImage);
    });

    it('should throw NotFoundException for non-existent image', async () => {
      const imageId = 'nonexistent';
      db.image.findUnique.mockResolvedValue(null);

      await expect(service.findOne(imageId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for private image accessed by non-uploader', async () => {
      const imageId = 'img1';
      const mockImage = {
        id: imageId,
        description: 'Private image',
        visibility: Visibility.PRIVATE,
        uploaderId: 'user1',
      };

      db.image.findUnique.mockResolvedValue(mockImage);

      await expect(service.findOne(imageId, 'user2')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update image successfully', async () => {
      const imageId = 'img1';
      const userId = 'user1';
      const input = { description: 'Updated description' };

      const mockExistingImage = {
        id: imageId,
        uploaderId: userId,
        visibility: Visibility.PUBLIC,
      };

      const mockUpdatedImage = {
        ...mockExistingImage,
        ...input,
      };

      db.image.findUnique.mockResolvedValue(mockExistingImage);
      db.image.update.mockResolvedValue(mockUpdatedImage);

      const result = await service.update(imageId, userId, input);

      expect(db.image.update).toHaveBeenCalledWith({
        where: { id: imageId },
        data: input,
        include: expect.any(Object),
      });
      expect(result).toEqual(mockUpdatedImage);
    });

    it('should throw ForbiddenException when non-uploader tries to update', async () => {
      const imageId = 'img1';
      const mockImage = {
        id: imageId,
        uploaderId: 'user1',
        visibility: Visibility.PUBLIC,
      };

      db.image.findUnique.mockResolvedValue(mockImage);

      await expect(service.update(imageId, 'user2', { description: 'Hacked' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('should verify new character ownership when changing character', async () => {
      const imageId = 'img1';
      const userId = 'user1';
      const input = { characterId: 'char2' };

      const mockExistingImage = {
        id: imageId,
        uploaderId: userId,
        characterId: 'char1',
      };

      db.image.findUnique.mockResolvedValue(mockExistingImage);
      db.character.findUnique.mockResolvedValue({
        id: 'char2',
        ownerId: 'user2', // Different user
      });

      await expect(service.update(imageId, userId, input))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete image successfully', async () => {
      const imageId = 'img1';
      const userId = 'user1';

      const mockImage = {
        id: imageId,
        uploaderId: userId,
        visibility: Visibility.PUBLIC,
      };

      db.image.findUnique.mockResolvedValue(mockImage);
      db.image.delete.mockResolvedValue(mockImage);

      const result = await service.remove(imageId, userId);

      expect(db.image.delete).toHaveBeenCalledWith({
        where: { id: imageId },
      });
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when non-uploader tries to delete', async () => {
      const imageId = 'img1';
      const mockImage = {
        id: imageId,
        uploaderId: 'user1',
        visibility: Visibility.PUBLIC,
      };

      db.image.findUnique.mockResolvedValue(mockImage);

      await expect(service.remove(imageId, 'user2'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return paginated images with proper filtering', async () => {
      const mockImages = [
        { id: 'img1', description: 'Image 1', visibility: Visibility.PUBLIC },
        { id: 'img2', description: 'Image 2', visibility: Visibility.PUBLIC },
      ];

      db.image.findMany.mockResolvedValue(mockImages);
      db.image.count.mockResolvedValue(2);

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result).toEqual({
        images: mockImages,
        total: 2,
        hasMore: false,
      });

      expect(db.image.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { visibility: Visibility.PUBLIC },
          ]),
        }),
        include: {
          uploader: true,
          character: true,
          gallery: true,
          tags_rel: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      });
    });

    it('should filter by character when specified', async () => {
      const characterId = 'char1';
      const filters = { characterId, limit: 10, offset: 0 };

      db.image.findMany.mockResolvedValue([]);
      db.image.count.mockResolvedValue(0);

      await service.findAll(filters);

      expect(db.image.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { characterId },
          ]),
        }),
        include: {
          uploader: true,
          character: true,
          gallery: true,
          tags_rel: {
            include: {
              tag: true,
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
    it('should add tags to image', async () => {
      const imageId = 'img1';
      const userId = 'user1';
      const tagNames = ['art', 'digital'];

      const mockImage = {
        id: imageId,
        uploaderId: userId,
        visibility: Visibility.PUBLIC,
      };

      const mockTags = [
        { id: 'tag1', name: 'art' },
        { id: 'tag2', name: 'digital' },
      ];

      const mockUpdatedImage = {
        ...mockImage,
      };

      db.image.findUnique.mockResolvedValue(mockImage);
      db.tag.upsert.mockResolvedValueOnce(mockTags[0]).mockResolvedValueOnce(mockTags[1]);
      db.imageTag.upsert.mockResolvedValue({});
      db.image.findUnique.mockResolvedValueOnce(mockUpdatedImage);

      const result = await service.addTags(imageId, userId, tagNames);

      expect(db.tag.upsert).toHaveBeenCalledTimes(2);
      expect(db.imageTag.upsert).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockUpdatedImage);
    });
  });
});