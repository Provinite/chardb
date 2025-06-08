import { Resolver, Mutation, Query, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SocialService } from './social.service';
import { ToggleLikeInput, LikeResult, LikeStatus, LikeableType } from './dto/like.dto';
import { Like } from './entities/like.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DatabaseService } from '../database/database.service';
import { Character } from '../characters/entities/character.entity';
import { Image } from '../images/entities/image.entity';
import { Gallery } from '../galleries/entities/gallery.entity';
import { Comment } from '../comments/entities/comment.entity';

@Resolver(() => Like)
export class SocialResolver {
  constructor(
    private readonly socialService: SocialService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Mutation(() => LikeResult)
  @UseGuards(JwtAuthGuard)
  async toggleLike(
    @Args('input') input: ToggleLikeInput,
    @CurrentUser() user: any,
  ): Promise<LikeResult> {
    return this.socialService.toggleLike(user.id, input);
  }

  @Query(() => LikeStatus)
  @UseGuards(OptionalJwtAuthGuard)
  async likeStatus(
    @Args('entityType', { type: () => LikeableType }) entityType: LikeableType,
    @Args('entityId', { type: () => ID }) entityId: string,
    @CurrentUser() user?: any,
  ): Promise<LikeStatus> {
    return this.socialService.getLikeStatus(entityType, entityId, user?.id);
  }

  // Resolve polymorphic relations for Like entity
  @ResolveField(() => Character, { nullable: true })
  async character(@Parent() like: Like): Promise<Character | null> {
    if (like.likeableType !== LikeableType.CHARACTER) {
      return null;
    }

    const character = await this.databaseService.character.findUnique({
      where: { id: like.likeableId },
      include: {
        owner: true,
        creator: true,
      },
    });

    if (!character) return null;

    return {
      ...character,
      price: character.price ? Number(character.price) : null,
      likesCount: 0, // Will be resolved by field resolver
      userHasLiked: false, // Will be resolved by field resolver
    } as Character;
  }

  @ResolveField(() => Image, { nullable: true })
  async image(@Parent() like: Like): Promise<Image | null> {
    if (like.likeableType !== LikeableType.IMAGE) {
      return null;
    }

    const image = await this.databaseService.image.findUnique({
      where: { id: like.likeableId },
      include: {
        uploader: true,
        character: {
          include: {
            owner: true,
            creator: true,
          },
        },
        gallery: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!image) return null;

    return {
      ...image,
      character: image.character ? {
        ...image.character,
        price: image.character.price ? Number(image.character.price) : null,
        likesCount: 0,
        userHasLiked: false,
      } : null,
      gallery: image.gallery ? {
        ...image.gallery,
        character: null,
        images: [],
        likesCount: 0,
        userHasLiked: false,
      } : null,
      likesCount: 0, // Will be resolved by field resolver
      userHasLiked: false, // Will be resolved by field resolver
    } as Image;
  }

  @ResolveField(() => Gallery, { nullable: true })
  async gallery(@Parent() like: Like): Promise<Gallery | null> {
    if (like.likeableType !== LikeableType.GALLERY) {
      return null;
    }

    const gallery = await this.databaseService.gallery.findUnique({
      where: { id: like.likeableId },
      include: {
        owner: true,
        character: {
          include: {
            owner: true,
            creator: true,
          },
        },
      },
    });

    if (!gallery) return null;

    return {
      ...gallery,
      character: gallery.character ? {
        ...gallery.character,
        price: gallery.character.price ? Number(gallery.character.price) : null,
        likesCount: 0,
        userHasLiked: false,
      } : null,
      images: [],
      likesCount: 0, // Will be resolved by field resolver
      userHasLiked: false, // Will be resolved by field resolver
    } as Gallery;
  }

  @ResolveField(() => Comment, { nullable: true })
  async comment(@Parent() like: Like): Promise<Comment | null> {
    if (like.likeableType !== LikeableType.COMMENT) {
      return null;
    }

    const comment = await this.databaseService.comment.findUnique({
      where: { id: like.likeableId },
      include: {
        author: true,
        parent: {
          include: {
            author: true,
          },
        },
        replies: {
          include: {
            author: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    if (!comment) return null;

    return {
      ...comment,
      parent: comment.parent ? {
        ...comment.parent,
        replies: [],
        repliesCount: 0,
        character: undefined,
        image: undefined,
        gallery: undefined,
        likesCount: 0,
        userHasLiked: false,
      } : undefined,
      replies: comment.replies?.map(reply => ({
        ...reply,
        parent: undefined,
        replies: [],
        repliesCount: 0,
        character: undefined,
        image: undefined,
        gallery: undefined,
        likesCount: 0,
        userHasLiked: false,
      })) || [],
      repliesCount: comment._count?.replies || 0,
      // Polymorphic relations will be resolved in the resolver
      character: undefined,
      image: undefined,
      gallery: undefined,
      // Social features will be resolved by field resolvers
      likesCount: 0,
      userHasLiked: false,
    } as Comment;
  }
}

// Field resolvers for existing entities
@Resolver(() => Character)
export class CharacterLikesResolver {
  constructor(private readonly socialService: SocialService) {}

  @ResolveField(() => Number)
  async likesCount(@Parent() character: Character): Promise<number> {
    return this.socialService.getLikesCount(LikeableType.CHARACTER, character.id);
  }

  @ResolveField(() => Boolean)
  @UseGuards(OptionalJwtAuthGuard)
  async userHasLiked(
    @Parent() character: Character,
    @CurrentUser() user?: any,
  ): Promise<boolean> {
    return this.socialService.getUserHasLiked(LikeableType.CHARACTER, character.id, user?.id);
  }
}

@Resolver(() => Image)
export class ImageLikesResolver {
  constructor(private readonly socialService: SocialService) {}

  @ResolveField(() => Number)
  async likesCount(@Parent() image: Image): Promise<number> {
    return this.socialService.getLikesCount(LikeableType.IMAGE, image.id);
  }

  @ResolveField(() => Boolean)
  @UseGuards(OptionalJwtAuthGuard)
  async userHasLiked(
    @Parent() image: Image,
    @CurrentUser() user?: any,
  ): Promise<boolean> {
    return this.socialService.getUserHasLiked(LikeableType.IMAGE, image.id, user?.id);
  }
}

@Resolver(() => Gallery)
export class GalleryLikesResolver {
  constructor(private readonly socialService: SocialService) {}

  @ResolveField(() => Number)
  async likesCount(@Parent() gallery: Gallery): Promise<number> {
    return this.socialService.getLikesCount(LikeableType.GALLERY, gallery.id);
  }

  @ResolveField(() => Boolean)
  @UseGuards(OptionalJwtAuthGuard)
  async userHasLiked(
    @Parent() gallery: Gallery,
    @CurrentUser() user?: any,
  ): Promise<boolean> {
    return this.socialService.getUserHasLiked(LikeableType.GALLERY, gallery.id, user?.id);
  }
}

@Resolver(() => Comment)
export class CommentLikesResolver {
  constructor(private readonly socialService: SocialService) {}

  @ResolveField(() => Number)
  async likesCount(@Parent() comment: Comment): Promise<number> {
    return this.socialService.getLikesCount(LikeableType.COMMENT, comment.id);
  }

  @ResolveField(() => Boolean)
  @UseGuards(OptionalJwtAuthGuard)
  async userHasLiked(
    @Parent() comment: Comment,
    @CurrentUser() user?: any,
  ): Promise<boolean> {
    return this.socialService.getUserHasLiked(LikeableType.COMMENT, comment.id, user?.id);
  }
}