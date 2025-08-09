import { Resolver, Mutation, Query, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SocialService } from './social.service';
import { ToggleLikeInput, LikeResult, LikeStatus, LikeableType } from './dto/like.dto';
import { ToggleFollowInput, FollowResult, FollowStatus } from './dto/follow.dto';
import { FollowListResult, ActivityItem, ActivityFeedInput } from './dto/social-query.dto';
import { Follow } from './entities/follow.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DatabaseService } from '../database/database.service';
import { Character } from '../characters/entities/character.entity';
import { Image } from '../images/entities/image.entity';
import { Gallery } from '../galleries/entities/gallery.entity';
import { Comment } from '../comments/entities/comment.entity';
import { User } from '../users/entities/user.entity';
import { Media } from '../media/entities/media.entity';

// Helper function to add default social fields to User objects
function addDefaultSocialFields(user: any): User {
  return {
    ...user,
    followersCount: 0,
    followingCount: 0,
    userIsFollowing: false,
  };
}

@Resolver()
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


  // Follow System Mutations and Queries

  @Mutation(() => FollowResult)
  @UseGuards(JwtAuthGuard)
  async toggleFollow(
    @Args('input') input: ToggleFollowInput,
    @CurrentUser() user: any,
  ): Promise<FollowResult> {
    return this.socialService.toggleFollow(user.id, input);
  }

  @Query(() => FollowStatus)
  @UseGuards(OptionalJwtAuthGuard)
  async followStatus(
    @Args('userId', { type: () => ID }) userId: string,
    @CurrentUser() user?: any,
  ): Promise<FollowStatus> {
    return this.socialService.getFollowStatus(userId, user?.id);
  }

  // Queries for user's liked content
  @Query(() => [Character])
  @UseGuards(JwtAuthGuard)
  async likedCharacters(
    @CurrentUser() user: any,
  ): Promise<Character[]> {
    return this.socialService.getUserLikedCharacters(user.id);
  }

  @Query(() => [Gallery])
  @UseGuards(JwtAuthGuard)
  async likedGalleries(
    @CurrentUser() user: any,
  ): Promise<Gallery[]> {
    return this.socialService.getUserLikedGalleries(user.id);
  }

  @Query(() => [Image])
  @UseGuards(JwtAuthGuard)
  async likedImages(
    @CurrentUser() user: any,
  ): Promise<Image[]> {
    return this.socialService.getUserLikedImages(user.id);
  }

  @Query(() => [Media])
  @UseGuards(JwtAuthGuard)
  async likedMedia(
    @CurrentUser() user: any,
  ): Promise<Media[]> {
    return this.socialService.getUserLikedMedia(user.id);
  }

  // Follow list queries
  @Query(() => FollowListResult)
  async getFollowers(
    @Args('username') username: string,
  ): Promise<FollowListResult> {
    const result = await this.socialService.getFollowers(username);
    return {
      user: result.user,
      followers: result.followers,
    };
  }

  @Query(() => FollowListResult)
  async getFollowing(
    @Args('username') username: string,
  ): Promise<FollowListResult> {
    const result = await this.socialService.getFollowing(username);
    return {
      user: result.user,
      following: result.following,
    };
  }

  // Activity feed query
  @Query(() => [ActivityItem])
  @UseGuards(JwtAuthGuard)
  async activityFeed(
    @Args('input', { nullable: true }) input?: ActivityFeedInput,
    @CurrentUser() user?: any,
  ): Promise<ActivityItem[]> {
    const { limit = 20, offset = 0 } = input || {};
    return this.socialService.getActivityFeed(user.id, limit, offset);
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

@Resolver(() => Media)
export class MediaLikesResolver {
  constructor(private readonly socialService: SocialService) {}

  @ResolveField(() => Number)
  async likesCount(@Parent() media: Media): Promise<number> {
    return this.socialService.getLikesCount(LikeableType.MEDIA, media.id);
  }

  @ResolveField(() => Boolean)
  @UseGuards(OptionalJwtAuthGuard)
  async userHasLiked(
    @Parent() media: Media,
    @CurrentUser() user?: any,
  ): Promise<boolean> {
    return this.socialService.getUserHasLiked(LikeableType.MEDIA, media.id, user?.id);
  }
}

@Resolver(() => User)
export class UserFollowResolver {
  constructor(private readonly socialService: SocialService) {}

  @ResolveField(() => Number)
  async followersCount(@Parent() user: User): Promise<number> {
    return this.socialService.getFollowersCount(user.id);
  }

  @ResolveField(() => Number)
  async followingCount(@Parent() user: User): Promise<number> {
    return this.socialService.getFollowingCount(user.id);
  }

  @ResolveField(() => Boolean)
  @UseGuards(OptionalJwtAuthGuard)
  async userIsFollowing(
    @Parent() user: User,
    @CurrentUser() currentUser?: any,
  ): Promise<boolean> {
    return this.socialService.getUserIsFollowing(user.id, currentUser?.id);
  }
}