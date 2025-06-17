import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma, Visibility } from '@chardb/database';
import * as sharp from 'sharp';
import { v4 as uuid } from 'uuid';
import { extname } from 'path';
import type { Image } from '@chardb/database';

export interface UploadImageInput {
  file: Express.Multer.File;
  characterId?: string;
  galleryId?: string;
  description?: string;
  altText?: string;
  isNsfw?: boolean;
  visibility?: Visibility;
  artistId?: string;
  artistName?: string;
  artistUrl?: string;
  source?: string;
}

export interface UpdateImageInput {
  description?: string;
  altText?: string;
  isNsfw?: boolean;
  visibility?: Visibility;
  characterId?: string;
  galleryId?: string;
  artistId?: string;
  artistName?: string;
  artistUrl?: string;
  source?: string;
}

export interface ImageFilters {
  limit?: number;
  offset?: number;
  uploaderId?: string;
  characterId?: string;
  galleryId?: string;
  isNsfw?: boolean;
  visibility?: Visibility;
  search?: string;
  artistId?: string;
}

@Injectable()
export class ImagesService {
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ];
  
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly thumbnailSize = 300;
  private readonly mediumSize = 800;

  constructor(private readonly db: DatabaseService) {}

  async upload(userId: string, input: UploadImageInput): Promise<Image> {
    const { 
      file, 
      characterId, 
      galleryId, 
      description, 
      altText, 
      isNsfw = false, 
      visibility = Visibility.PUBLIC,
      artistId,
      artistName,
      artistUrl,
      source
    } = input;

    // Validate file
    this.validateFile(file);

    // Verify character/gallery ownership if specified
    if (characterId) {
      await this.verifyCharacterOwnership(characterId, userId);
    }
    if (galleryId) {
      await this.verifyGalleryOwnership(galleryId, userId);
    }
    
    // Verify artist exists if artistId is provided
    if (artistId) {
      const artist = await this.db.user.findUnique({ where: { id: artistId } });
      if (!artist) {
        throw new BadRequestException('Artist not found');
      }
    }

    // Generate unique filename
    const fileExtension = extname(file.originalname);
    const filename = `${uuid()}${fileExtension}`;

    // Process image with Sharp
    const { processedImage, thumbnail, metadata } = await this.processImage(file.buffer);

    // For now, we'll store base64 encoded images in the database
    // In production, you'd upload to S3/CloudStorage and store URLs
    const imageUrl = `data:${file.mimetype};base64,${processedImage.toString('base64')}`;
    
    // Determine thumbnail MIME type based on original format
    const thumbnailMimeType = file.mimetype === 'image/png' ? 'image/png' : 'image/jpeg';
    const thumbnailUrl = `data:${thumbnailMimeType};base64,${thumbnail.toString('base64')}`;

    // Create image record
    return this.db.image.create({
      data: {
        filename,
        originalFilename: file.originalname,
        url: imageUrl,
        thumbnailUrl,
        altText,
        description,
        uploaderId: userId,
        characterId,
        galleryId,
        artistId,
        artistName,
        artistUrl,
        source,
        width: metadata.width!,
        height: metadata.height!,
        fileSize: file.size,
        mimeType: file.mimetype,
        isNsfw,
        visibility,
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
  }

  async findAll(filters: ImageFilters = {}, userId?: string) {
    const {
      limit = 20,
      offset = 0,
      uploaderId,
      characterId,
      galleryId,
      isNsfw,
      visibility,
      search,
      artistId,
    } = filters;

    const where: Prisma.ImageWhereInput = {
      AND: [
        // Visibility filter
        userId 
          ? {
              OR: [
                { visibility: Visibility.PUBLIC },
                { uploaderId: userId }, // User can see their own images
                { visibility: Visibility.UNLISTED },
              ],
            }
          : { visibility: Visibility.PUBLIC },
        
        // Other filters
        uploaderId ? { uploaderId } : {},
        characterId ? { characterId } : {},
        galleryId ? { galleryId } : {},
        artistId ? { artistId } : {},
        isNsfw !== undefined ? { isNsfw } : {},
        visibility !== undefined ? { visibility } : {},
        
        // Search filter
        search ? {
          OR: [
            { description: { contains: search, mode: 'insensitive' } },
            { altText: { contains: search, mode: 'insensitive' } },
            { originalFilename: { contains: search, mode: 'insensitive' } },
            { artistName: { contains: search, mode: 'insensitive' } },
          ],
        } : {},
      ],
    };

    const [images, total] = await Promise.all([
      this.db.image.findMany({
        where,
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
        take: limit,
        skip: offset,
      }),
      this.db.image.count({ where }),
    ]);

    return {
      images,
      total,
      hasMore: offset + limit < total,
    };
  }

  async findOne(id: string, userId?: string): Promise<Image> {
    const image = await this.db.image.findUnique({
      where: { id },
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

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Check visibility permissions
    if (image.visibility === Visibility.PRIVATE) {
      if (!userId || image.uploaderId !== userId) {
        throw new ForbiddenException('Image is private');
      }
    }

    return image;
  }

  async update(id: string, userId: string, input: UpdateImageInput): Promise<Image> {
    const image = await this.findOne(id, userId);

    // Check ownership
    if (image.uploaderId !== userId) {
      throw new ForbiddenException('You can only edit your own images');
    }

    // Verify new character/gallery ownership if changing
    if (input.characterId && input.characterId !== image.characterId) {
      await this.verifyCharacterOwnership(input.characterId, userId);
    }
    if (input.galleryId && input.galleryId !== image.galleryId) {
      await this.verifyGalleryOwnership(input.galleryId, userId);
    }
    
    // Verify artist exists if artistId is provided
    if (input.artistId && input.artistId !== image.artistId) {
      const artist = await this.db.user.findUnique({ where: { id: input.artistId } });
      if (!artist) {
        throw new BadRequestException('Artist not found');
      }
    }

    return this.db.image.update({
      where: { id },
      data: input,
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
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const image = await this.findOne(id, userId);

    // Check ownership
    if (image.uploaderId !== userId) {
      throw new ForbiddenException('You can only delete your own images');
    }

    await this.db.image.delete({
      where: { id },
    });

    return true;
  }

  async addTags(imageId: string, userId: string, tagNames: string[]): Promise<Image> {
    const image = await this.findOne(imageId, userId);

    // Check ownership
    if (image.uploaderId !== userId) {
      throw new ForbiddenException('You can only modify tags on your own images');
    }

    // Create tags if they don't exist and connect them
    for (const tagName of tagNames) {
      const tag = await this.db.tag.upsert({
        where: { name: tagName.toLowerCase() },
        create: { name: tagName.toLowerCase() },
        update: {},
      });

      await this.db.imageTag.upsert({
        where: {
          imageId_tagId: {
            imageId,
            tagId: tag.id,
          },
        },
        create: {
          imageId,
          tagId: tag.id,
        },
        update: {},
      });
    }

    return this.findOne(imageId, userId);
  }

  async removeTags(imageId: string, userId: string, tagNames: string[]): Promise<Image> {
    const image = await this.findOne(imageId, userId);

    // Check ownership
    if (image.uploaderId !== userId) {
      throw new ForbiddenException('You can only modify tags on your own images');
    }

    // Remove tag connections
    await this.db.imageTag.deleteMany({
      where: {
        imageId,
        tag: {
          name: { in: tagNames.map(name => name.toLowerCase()) },
        },
      },
    });

    return this.findOne(imageId, userId);
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File too large. Maximum size: ${this.maxFileSize / 1024 / 1024}MB`
      );
    }
  }

  private async processImage(buffer: Buffer) {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // For GIFs, preserve original to maintain animations
      if (metadata.format === 'gif') {
        // Create static thumbnail only for GIFs
        const thumbnail = image
          .resize(this.thumbnailSize, this.thumbnailSize, { 
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 80 });

        const thumbnailBuffer = await thumbnail.toBuffer();

        return {
          processedImage: buffer, // Return original GIF buffer
          thumbnail: thumbnailBuffer,
          metadata,
        };
      }

      // Process main image (resize if too large, optimize quality)
      let processedImage = image;
      
      // Only resize if larger than 4000px (less aggressive than before)
      if (metadata.width! > 4000 || metadata.height! > 4000) {
        processedImage = image.resize(4000, 4000, { 
          fit: 'inside',
          withoutEnlargement: true 
        });
      }

      // Format-specific optimization with higher quality
      if (metadata.format === 'jpeg') {
        processedImage = processedImage.jpeg({ quality: 92, progressive: true });
      } else if (metadata.format === 'png') {
        // Minimal compression for PNGs to preserve transparency
        processedImage = processedImage.png({ compressionLevel: 6, adaptiveFiltering: false });
      } else if (metadata.format === 'webp') {
        processedImage = processedImage.webp({ quality: 95, lossless: false });
      }

      // Generate format-appropriate thumbnail
      let thumbnail;
      if (metadata.format === 'png') {
        // Keep PNG thumbnails as PNG to preserve transparency
        thumbnail = image
          .resize(this.thumbnailSize, this.thumbnailSize, { 
            fit: 'cover',
            position: 'center'
          })
          .png({ compressionLevel: 6 });
      } else {
        // Use JPEG for other formats
        thumbnail = image
          .resize(this.thumbnailSize, this.thumbnailSize, { 
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 85 });
      }

      const [processedBuffer, thumbnailBuffer] = await Promise.all([
        processedImage.toBuffer(),
        thumbnail.toBuffer(),
      ]);

      return {
        processedImage: processedBuffer,
        thumbnail: thumbnailBuffer,
        metadata,
      };
    } catch (error) {
      throw new BadRequestException('Invalid image file or processing failed');
    }
  }

  private async verifyCharacterOwnership(characterId: string, userId: string): Promise<void> {
    const character = await this.db.character.findUnique({
      where: { id: characterId },
      select: { ownerId: true },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    if (character.ownerId !== userId) {
      throw new ForbiddenException('You can only upload images to your own characters');
    }
  }

  private async verifyGalleryOwnership(galleryId: string, userId: string): Promise<void> {
    const gallery = await this.db.gallery.findUnique({
      where: { id: galleryId },
      select: { ownerId: true },
    });

    if (!gallery) {
      throw new NotFoundException('Gallery not found');
    }

    if (gallery.ownerId !== userId) {
      throw new ForbiddenException('You can only upload images to your own galleries');
    }
  }
}