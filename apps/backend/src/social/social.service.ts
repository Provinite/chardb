import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { LikeableType, ToggleLikeInput, LikeResult, LikeStatus } from './dto/like.dto';

@Injectable()
export class SocialService {
  constructor(private readonly databaseService: DatabaseService) {}

  async toggleLike(userId: string, input: ToggleLikeInput): Promise<LikeResult> {
    // Validate that the entity exists
    await this.validateEntity(input.entityType, input.entityId);

    // Use transaction for atomicity
    const result = await this.databaseService.$transaction(async (tx) => {
      const existingLike = await tx.like.findUnique({
        where: {
          userId_likeableType_likeableId: {
            userId,
            likeableType: input.entityType,
            likeableId: input.entityId,
          },
        },
      });

      let isLiked: boolean;

      if (existingLike) {
        // Unlike - remove the like
        await tx.like.delete({
          where: { id: existingLike.id },
        });
        isLiked = false;
      } else {
        // Like - create new like
        await tx.like.create({
          data: {
            userId,
            likeableType: input.entityType,
            likeableId: input.entityId,
          },
        });
        isLiked = true;
      }

      // Get updated count
      const likesCount = await tx.like.count({
        where: {
          likeableType: input.entityType,
          likeableId: input.entityId,
        },
      });

      return {
        isLiked,
        likesCount,
        entityType: input.entityType,
        entityId: input.entityId,
      };
    });

    return result;
  }

  async getLikeStatus(
    entityType: LikeableType,
    entityId: string,
    userId?: string,
  ): Promise<LikeStatus> {
    // Get likes count
    const likesCount = await this.databaseService.like.count({
      where: {
        likeableType: entityType,
        likeableId: entityId,
      },
    });

    // Check if user has liked (if user is provided)
    let isLiked = false;
    if (userId) {
      const userLike = await this.databaseService.like.findUnique({
        where: {
          userId_likeableType_likeableId: {
            userId,
            likeableType: entityType,
            likeableId: entityId,
          },
        },
      });
      isLiked = !!userLike;
    }

    return {
      isLiked,
      likesCount,
    };
  }

  async getLikesCount(entityType: LikeableType, entityId: string): Promise<number> {
    return this.databaseService.like.count({
      where: {
        likeableType: entityType,
        likeableId: entityId,
      },
    });
  }

  async getUserHasLiked(
    entityType: LikeableType,
    entityId: string,
    userId?: string,
  ): Promise<boolean> {
    if (!userId) {
      return false;
    }

    const userLike = await this.databaseService.like.findUnique({
      where: {
        userId_likeableType_likeableId: {
          userId,
          likeableType: entityType,
          likeableId: entityId,
        },
      },
    });

    return !!userLike;
  }

  private async validateEntity(entityType: LikeableType, entityId: string): Promise<void> {
    let exists = false;

    switch (entityType) {
      case LikeableType.CHARACTER:
        const character = await this.databaseService.character.findUnique({
          where: { id: entityId },
        });
        exists = !!character;
        break;
      case LikeableType.IMAGE:
        const image = await this.databaseService.image.findUnique({
          where: { id: entityId },
        });
        exists = !!image;
        break;
      case LikeableType.GALLERY:
        const gallery = await this.databaseService.gallery.findUnique({
          where: { id: entityId },
        });
        exists = !!gallery;
        break;
      case LikeableType.COMMENT:
        const comment = await this.databaseService.comment.findUnique({
          where: { id: entityId },
        });
        exists = !!comment;
        break;
    }

    if (!exists) {
      throw new BadRequestException(`${entityType.toLowerCase()} not found`);
    }
  }
}