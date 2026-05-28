import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ImagesService } from './images.service';
import { DatabaseService } from '../database/database.service';
import { TagsService } from '../tags/tags.service';
import { S3Service } from './s3.service';
import { PermissionService } from '../auth/PermissionService';
import { CommunityResolverService } from '../auth/services/community-resolver.service';
import { mockDatabaseService } from '../../test/setup';

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
    png: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image')),
  }));
});

const mockTagsService = { findOrCreateTags: jest.fn(), getImageTags: jest.fn() };
const mockS3Service = { uploadImage: jest.fn(), deleteImage: jest.fn(), deleteImages: jest.fn() };
const mockPermissionService = { hasCommunityPermission: jest.fn() };
const mockCommunityResolverService = { resolve: jest.fn() };

describe('ImagesService', () => {
  let service: ImagesService;
  let db: typeof mockDatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImagesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: TagsService, useValue: mockTagsService },
        { provide: S3Service, useValue: mockS3Service },
        { provide: PermissionService, useValue: mockPermissionService },
        { provide: CommunityResolverService, useValue: mockCommunityResolverService },
      ],
    }).compile();

    service = module.get<ImagesService>(ImagesService);
    db = module.get<DatabaseService>(DatabaseService) as unknown as typeof mockDatabaseService;
  });

  describe('upload', () => {
    const mockFile = {
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      size: 500000,
      buffer: Buffer.from('test-image-data'),
    } as Express.Multer.File;

    const mockS3Result = { url: 'https://test.s3.amazonaws.com/test.jpg' };

    it('should upload an image successfully', async () => {
      const userId = 'user1';

      const mockImage = {
        id: 'img1',
        filename: 'test-uuid.jpg',
        originalFilename: 'test.jpg',
        uploaderId: userId,
        mimeType: 'image/jpeg',
        fileSize: 500000,
        width: 1000,
        height: 800,
        uploader: { id: userId, username: 'testuser' },
        tags_rel: [],
      };
      const mockMedia = {
        id: 'media1',
        ownerId: userId,
        imageId: 'img1',
        image: mockImage,
        owner: { id: userId, username: 'testuser' },
      };

      mockS3Service.uploadImage.mockResolvedValue(mockS3Result);
      db.image.create.mockResolvedValue(mockImage);
      db.media.create.mockResolvedValue(mockMedia);

      const result = await service.upload(userId, { file: mockFile });

      expect(mockS3Service.uploadImage).toHaveBeenCalledTimes(3);
      expect(db.image.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            originalFilename: 'test.jpg',
            mimeType: 'image/jpeg',
            fileSize: 500000,
            uploaderId: userId,
            isNsfw: false,
          }),
        }),
      );
      expect(db.media.create).toHaveBeenCalled();
      expect(result).toEqual(mockMedia);
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
        size: 15 * 1024 * 1024,
      } as Express.Multer.File;

      await expect(service.upload('user1', { file: largeFile }))
        .rejects.toThrow(BadRequestException);
    });

    it('should verify character ownership when specified', async () => {
      db.character.findUnique.mockResolvedValue({
        id: 'char1',
        ownerId: 'user2',
      });

      await expect(service.upload('user1', { file: mockFile, characterId: 'char1' }))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should find an image', async () => {
      const imageId = 'img1';
      const mockImage = {
        id: imageId,
        originalFilename: 'test.jpg',
        uploaderId: 'user1',
        uploader: { id: 'user1' },
        tags_rel: [],
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
      db.image.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update image successfully', async () => {
      const imageId = 'img1';
      const userId = 'user1';
      const input = { altText: 'Updated alt text' };

      const mockExistingImage = {
        id: imageId,
        uploaderId: userId,
        uploader: { id: userId },
        tags_rel: [],
      };
      const mockUpdatedImage = { ...mockExistingImage, ...input };

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
      db.image.findUnique.mockResolvedValue({
        id: 'img1',
        uploaderId: 'user1',
        uploader: { id: 'user1' },
        tags_rel: [],
      });

      await expect(service.update('img1', 'user2', { altText: 'Hacked' }))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete image successfully', async () => {
      const imageId = 'img1';
      const userId = 'user1';

      db.image.findUnique.mockResolvedValue({
        id: imageId,
        uploaderId: userId,
        uploader: { id: userId },
        tags_rel: [],
      });
      db.image.delete.mockResolvedValue({ id: imageId });

      const result = await service.remove(imageId, userId);

      expect(db.image.delete).toHaveBeenCalledWith({ where: { id: imageId } });
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when non-uploader tries to delete', async () => {
      db.image.findUnique.mockResolvedValue({
        id: 'img1',
        uploaderId: 'user1',
        uploader: { id: 'user1' },
        tags_rel: [],
      });

      await expect(service.remove('img1', 'user2'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return paginated images with proper filtering', async () => {
      const mockImages = [
        { id: 'img1', originalFilename: 'Image 1' },
        { id: 'img2', originalFilename: 'Image 2' },
      ];

      db.image.findMany.mockResolvedValue(mockImages);
      db.image.count.mockResolvedValue(2);

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result).toEqual({
        images: mockImages,
        total: 2,
        hasMore: false,
      });

      expect(db.image.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { moderationStatus: 'APPROVED' },
            ]),
          }),
          include: expect.objectContaining({
            uploader: true,
          }),
          orderBy: { createdAt: 'desc' },
          take: 10,
          skip: 0,
        }),
      );
    });

    it('should filter by uploader when specified', async () => {
      const uploaderId = 'user1';
      const filters = { uploaderId, limit: 10, offset: 0 };

      db.image.findMany.mockResolvedValue([]);
      db.image.count.mockResolvedValue(0);

      await service.findAll(filters);

      expect(db.image.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { uploaderId },
            ]),
          }),
        }),
      );
    });
  });
});
