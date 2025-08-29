import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ID,
  ResolveField,
  Parent,
} from "@nestjs/graphql";
import { UseGuards, NotFoundException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { User, UserConnection } from "./entities/user.entity";
import { UserProfile, UserStats } from "./entities/user-profile.entity";
import { UpdateUserInput } from "./dto/update-user.input";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import {
  CurrentUser,
  CurrentUserType,
} from "../auth/decorators/current-user.decorator";
import { RemovalResponse } from "../shared/entities/removal-response.entity";
import {
  mapUpdateUserInputToService,
  mapPrismaUserToGraphQL,
  mapPrismaUserConnectionToGraphQL,
} from "./utils/user-resolver-mappers";
import { mapPrismaCharacterToGraphQL } from "../characters/utils/character-resolver-mappers";

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => UserConnection, { name: "users" })
  async findAll(
    @Args("limit", { type: () => Int, defaultValue: 20 }) limit: number,
    @Args("offset", { type: () => Int, defaultValue: 0 }) offset: number
  ): Promise<UserConnection> {
    const serviceResult = await this.usersService.findAll(limit, offset);
    return mapPrismaUserConnectionToGraphQL(serviceResult);
  }

  @Query(() => User, { name: "user", nullable: true })
  async findOne(
    @Args("id", { type: () => ID, nullable: true }) id?: string,
    @Args("username", { nullable: true }) username?: string
  ): Promise<User | null> {
    let prismaResult;
    if (id) {
      prismaResult = await this.usersService.findById(id);
    } else if (username) {
      prismaResult = await this.usersService.findByUsername(username);
    } else {
      throw new Error("Either id or username must be provided");
    }

    return prismaResult ? mapPrismaUserToGraphQL(prismaResult) : null;
  }

  @Query(() => User, { name: "me" })
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: CurrentUserType): Promise<User> {
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return mapPrismaUserToGraphQL(user);
  }

  @Mutation(() => User)
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Args("input") updateUserInput: UpdateUserInput,
    @CurrentUser() user: CurrentUserType
  ): Promise<User> {
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const serviceInput = mapUpdateUserInputToService(updateUserInput);
    const prismaResult = await this.usersService.update(user.id, serviceInput);
    return mapPrismaUserToGraphQL(prismaResult);
  }

  @Mutation(() => RemovalResponse)
  @UseGuards(JwtAuthGuard)
  async deleteAccount(
    @CurrentUser() user: CurrentUserType
  ): Promise<RemovalResponse> {
    if (!user) {
      throw new NotFoundException("User not found");
    }
    await this.usersService.remove(user.id);
    return { removed: true, message: "User account successfully deleted" };
  }

  @Query(() => UserProfile, { name: "userProfile", nullable: true })
  @UseGuards(OptionalJwtAuthGuard)
  async getUserProfile(
    @Args("username") username: string,
    @CurrentUser() currentUser?: CurrentUserType
  ): Promise<UserProfile | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user) return null;

    // Return only scalar fields - field resolvers will handle the rest
    return {
      user: mapPrismaUserToGraphQL(user),
      isOwnProfile: currentUser?.id === user.id,
      canViewPrivateContent:
        currentUser?.id === user.id || !!currentUser?.isAdmin,
    };
  }

  @Query(() => UserStats, { name: "userStats" })
  @UseGuards(OptionalJwtAuthGuard)
  async getUserStats(
    @Args("userId", { type: () => ID }) userId: string,
    @CurrentUser() currentUser?: CurrentUserType
  ): Promise<UserStats | null> {
    const user = await this.usersService.findById(userId);
    if (!user) return null;

    return { userId };
  }

  // Field resolvers for computed properties
  @ResolveField("followersCount", () => Int)
  async resolveFollowersCount(@Parent() user: User): Promise<number> {
    // TODO: Implement when social features are added
    return 0;
  }

  @ResolveField("followingCount", () => Int)
  async resolveFollowingCount(@Parent() user: User): Promise<number> {
    // TODO: Implement when social features are added
    return 0;
  }

  @ResolveField("userIsFollowing", () => Boolean)
  async resolveUserIsFollowing(
    @Parent() user: User,
    @CurrentUser() currentUser?: CurrentUserType
  ): Promise<boolean> {
    // TODO: Implement when social features are added
    return false;
  }
}

// UserProfile field resolvers
@Resolver(() => UserProfile)
export class UserProfileResolver {
  constructor(private readonly usersService: UsersService) {}

  @ResolveField("stats", () => UserStats)
  async resolveStats(@Parent() profile: UserProfile): Promise<UserStats> {
    return { userId: profile.user.id };
  }

  @ResolveField("recentCharacters", () => [mapPrismaCharacterToGraphQL])
  async resolveRecentCharacters(
    @Parent() profile: UserProfile,
    @CurrentUser() currentUser?: CurrentUserType
  ) {
    const includePrivate = profile.canViewPrivateContent;
    const characters = await this.usersService.getUserRecentCharacters(
      profile.user.id,
      includePrivate,
      6
    );
    return characters.map(mapPrismaCharacterToGraphQL);
  }

  @ResolveField("recentGalleries")
  async resolveRecentGalleries(
    @Parent() profile: UserProfile,
    @CurrentUser() currentUser?: CurrentUserType
  ) {
    const includePrivate = profile.canViewPrivateContent;
    return this.usersService.getUserRecentGalleries(
      profile.user.id,
      includePrivate,
      6
    );
  }

  @ResolveField("recentMedia")
  async resolveRecentMedia(@Parent() profile: UserProfile) {
    return this.usersService.getUserRecentMedia(profile.user.id, 12);
  }

  @ResolveField("featuredCharacters", () => [mapPrismaCharacterToGraphQL])
  async resolveFeaturedCharacters(@Parent() profile: UserProfile) {
    const characters = await this.usersService.getUserFeaturedCharacters(
      profile.user.id,
      3
    );
    return characters.map(mapPrismaCharacterToGraphQL);
  }
}

// UserStats field resolvers
@Resolver(() => UserStats)
export class UserStatsResolver {
  constructor(private readonly usersService: UsersService) {}

  @ResolveField("charactersCount", () => Int)
  async resolveCharactersCount(
    @Parent() stats: UserStats,
    @CurrentUser() currentUser?: CurrentUserType
  ) {
    if (!stats.userId) return 0;
    const includePrivate = currentUser?.id === stats.userId || !!currentUser?.isAdmin;
    return this.usersService.getUserCharactersCount(stats.userId, includePrivate);
  }

  @ResolveField("galleriesCount", () => Int)
  async resolveGalleriesCount(
    @Parent() stats: UserStats,
    @CurrentUser() currentUser?: CurrentUserType
  ) {
    if (!stats.userId) return 0;
    const includePrivate = currentUser?.id === stats.userId || !!currentUser?.isAdmin;
    return this.usersService.getUserGalleriesCount(stats.userId, includePrivate);
  }

  @ResolveField("imagesCount", () => Int)
  async resolveImagesCount(@Parent() stats: UserStats) {
    if (!stats.userId) return 0;
    return this.usersService.getUserImagesCount(stats.userId);
  }

  @ResolveField("totalViews", () => Int)
  async resolveTotalViews(@Parent() stats: UserStats) {
    // TODO: Implement when views system is added
    return 0;
  }

  @ResolveField("totalLikes", () => Int)
  async resolveTotalLikes(@Parent() stats: UserStats) {
    // TODO: Implement when likes system is added
    return 0;
  }

  @ResolveField("followersCount", () => Int)
  async resolveFollowersCount(@Parent() stats: UserStats) {
    // TODO: Implement when social features are added
    return 0;
  }

  @ResolveField("followingCount", () => Int)
  async resolveFollowingCount(@Parent() stats: UserStats) {
    // TODO: Implement when social features are added
    return 0;
  }
}