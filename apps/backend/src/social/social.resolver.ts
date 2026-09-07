import {
  Resolver,
  Mutation,
  Query,
  Args,
  ID,
  ResolveField,
  Parent,
  Int,
} from "@nestjs/graphql";
import { SocialService } from "./social.service";
import {
  ToggleLikeInput,
  LikeResult,
  LikeStatus,
  LikeableType,
} from "./dto/like.dto";
import {
  ToggleFollowInput,
  FollowResult,
  FollowStatus,
} from "./dto/follow.dto";
import {
  FollowListResult,
  ActivityItem,
  ActivityFeedInput,
} from "./dto/social-query.dto";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import type {
  AuthenticatedCurrentUserType,
  CurrentUserType,
} from "../auth/types/current-user.type";
import { mapPrismaCharacterToGraphQL } from "../characters/utils/character-resolver-mappers";
import { mapPrismaGalleryToGraphQL } from "../galleries/utils/gallery-resolver-mappers";
import { mapPrismaImageToGraphQL } from "../images/utils/image-resolver-mappers";
import { mapPrismaMediaConnectionToGraphQL } from "../media/utils/media-resolver-mappers";
import { mapPrismaUserToGraphQL } from "../users/utils/user-resolver-mappers";
import { DatabaseService } from "../database/database.service";
import { Character } from "../characters/entities/character.entity";
import { Image } from "../images/entities/image.entity";
import { Gallery } from "../galleries/entities/gallery.entity";
import { Comment } from "../comments/entities/comment.entity";
import { User } from "../users/entities/user.entity";
import { Media, MediaConnection } from "../media/entities/media.entity";
import { MediaFiltersInput } from "../media/dto/media.dto";

@Resolver()
export class SocialResolver {
  constructor(
    private readonly socialService: SocialService,
    private readonly databaseService: DatabaseService,
  ) {}

  @AllowAnyAuthenticated()
  @Mutation(() => LikeResult)
  async toggleLike(
    @Args("input") input: ToggleLikeInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<LikeResult> {
    return this.socialService.toggleLike(user.id, input);
  }

  @AllowUnauthenticated()
  @Query(() => LikeStatus)
  async likeStatus(
    @Args("entityType", { type: () => LikeableType }) entityType: LikeableType,
    @Args("entityId", { type: () => ID }) entityId: string,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<LikeStatus> {
    return this.socialService.getLikeStatus(entityType, entityId, user?.id);
  }

  // Follow System Mutations and Queries

  @AllowAnyAuthenticated()
  @Mutation(() => FollowResult)
  async toggleFollow(
    @Args("input") input: ToggleFollowInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<FollowResult> {
    return this.socialService.toggleFollow(user.id, input);
  }

  @AllowAnyAuthenticated()
  @Query(() => FollowStatus)
  async followStatus(
    @Args("userId", { type: () => ID }) userId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<FollowStatus> {
    return this.socialService.getFollowStatus(userId, user.id);
  }

  // Queries for user's liked content
  @AllowAnyAuthenticated()
  @Query(() => [Character])
  async likedCharacters(
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<Character[]> {
    const characters = await this.socialService.getUserLikedCharacters(user.id);
    return characters.map(mapPrismaCharacterToGraphQL);
  }

  @AllowAnyAuthenticated()
  @Query(() => [Gallery])
  async likedGalleries(
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<Gallery[]> {
    const galleries = await this.socialService.getUserLikedGalleries(user.id);
    return galleries.map(mapPrismaGalleryToGraphQL);
  }

  @AllowAnyAuthenticated()
  @Query(() => [Image])
  async likedImages(
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<Image[]> {
    const images = await this.socialService.getUserLikedImages(user.id);
    return images.map(mapPrismaImageToGraphQL);
  }

  @AllowAnyAuthenticated()
  @Query(() => MediaConnection)
  async likedMedia(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("filters", { nullable: true }) filters?: MediaFiltersInput,
  ): Promise<MediaConnection> {
    const connection = await this.socialService.getUserLikedMedia(
      user.id,
      filters,
    );
    return mapPrismaMediaConnectionToGraphQL(connection);
  }

  // Follow list queries
  @AllowUnauthenticated()
  @Query(() => FollowListResult)
  async getFollowers(
    @Args("username") username: string,
  ): Promise<FollowListResult> {
    const result = await this.socialService.getFollowers(username);
    return {
      user: mapPrismaUserToGraphQL(result.user),
      followers: result.followers.map(mapPrismaUserToGraphQL),
    };
  }

  @AllowUnauthenticated()
  @Query(() => FollowListResult)
  async getFollowing(
    @Args("username") username: string,
  ): Promise<FollowListResult> {
    const result = await this.socialService.getFollowing(username);
    return {
      user: mapPrismaUserToGraphQL(result.user),
      following: result.following.map(mapPrismaUserToGraphQL),
    };
  }

  // Activity feed query
  @AllowAnyAuthenticated()
  @Query(() => [ActivityItem])
  async activityFeed(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("input", { nullable: true }) input?: ActivityFeedInput,
  ): Promise<ActivityItem[]> {
    const { limit = 20, offset = 0 } = input || {};
    const activities = await this.socialService.getActivityFeed(
      user.id,
      limit,
      offset,
    );
    return activities.map((activity) => ({
      ...activity,
      user: mapPrismaUserToGraphQL(activity.user),
    }));
  }
}

// Field resolvers for existing entities.
//
// `likesCount` is deliberately absent from all but CommentLikesResolver below.
// Character, Image, Gallery and Media each declare that field in their own
// module, and those declarations win -- a field is resolved by whichever
// module registers it first, and every one of them is imported into AppModule
// ahead of SocialModule. The copies that used to sit here were shadowed, so
// they were dead code that only mattered when it was wrong: undecorated, they
// were one module reorder away from 403ing the four types that work today
// (#310).
@Resolver(() => Character)
export class CharacterLikesResolver {
  constructor(private readonly socialService: SocialService) {}

  @AllowAnyAuthenticated()
  @ResolveField(() => Boolean)
  async userHasLiked(
    @Parent() character: Character,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.socialService.getUserHasLiked(
      LikeableType.CHARACTER,
      character.id,
      user.id,
    );
  }
}

@Resolver(() => Image)
export class ImageLikesResolver {
  constructor(private readonly socialService: SocialService) {}

  @AllowAnyAuthenticated()
  @ResolveField(() => Boolean)
  async userHasLiked(
    @Parent() image: Image,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.socialService.getUserHasLiked(
      LikeableType.IMAGE,
      image.id,
      user.id,
    );
  }
}

@Resolver(() => Gallery)
export class GalleryLikesResolver {
  constructor(private readonly socialService: SocialService) {}

  @AllowAnyAuthenticated()
  @ResolveField(() => Boolean)
  async userHasLiked(
    @Parent() gallery: Gallery,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.socialService.getUserHasLiked(
      LikeableType.GALLERY,
      gallery.id,
      user.id,
    );
  }
}

@Resolver(() => Comment)
export class CommentLikesResolver {
  constructor(private readonly socialService: SocialService) {}

  /**
   * The one `likesCount` in this file that is actually live: no other module
   * declares it on Comment, so unlike its four siblings this was the resolver
   * being reached -- and it carried no `@Allow*`, which under a deny-by-default
   * chain means forbidden to everyone, admins included.
   *
   * Unauthenticated because the field is `Int!` and the comment list is public.
   * A 403 on a non-nullable field nulls its parent, so denying this nulled
   * every Comment, then the list, and `CommentList` blanked the whole section
   * -- taking the comment form with it. Nobody could comment on a character
   * (#310). Same mechanism as the public gallery in #173.
   */
  @AllowUnauthenticated()
  @ResolveField(() => Int)
  async likesCount(@Parent() comment: Comment): Promise<number> {
    return this.socialService.getLikesCount(LikeableType.COMMENT, comment.id);
  }

  @AllowAnyAuthenticated()
  @ResolveField(() => Boolean)
  async userHasLiked(
    @Parent() comment: Comment,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.socialService.getUserHasLiked(
      LikeableType.COMMENT,
      comment.id,
      user.id,
    );
  }
}

@Resolver(() => Media)
export class MediaLikesResolver {
  constructor(private readonly socialService: SocialService) {}

  @AllowAnyAuthenticated()
  @ResolveField(() => Boolean)
  async userHasLiked(
    @Parent() media: Media,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.socialService.getUserHasLiked(
      LikeableType.MEDIA,
      media.id,
      user.id,
    );
  }
}

@Resolver(() => User)
export class UserFollowResolver {
  constructor(private readonly socialService: SocialService) {}

  /**
   * Unauthenticated for the same reason as `Comment.likesCount`: `Int!` on a
   * public profile page, so a denial nulls the whole User rather than the
   * field. These were undecorated AND shadowed by stubs in `UsersResolver`
   * that answered 0 -- the stubs won, so the field 403'd and the real counts
   * here were never reached. The stubs are gone; this is now the only
   * declaration (#310).
   */
  @AllowUnauthenticated()
  @ResolveField(() => Int)
  async followersCount(@Parent() user: User): Promise<number> {
    return this.socialService.getFollowersCount(user.id);
  }

  @AllowUnauthenticated()
  @ResolveField(() => Int)
  async followingCount(@Parent() user: User): Promise<number> {
    return this.socialService.getFollowingCount(user.id);
  }

  @AllowAnyAuthenticated()
  @ResolveField(() => Boolean)
  async userIsFollowing(
    @Parent() user: User,
    @CurrentUser() currentUser: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.socialService.getUserIsFollowing(user.id, currentUser.id);
  }
}
