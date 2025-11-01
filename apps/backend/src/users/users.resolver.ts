import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ID,
  ResolveField,
  Parent,
  Extensions,
} from "@nestjs/graphql";
import { NotFoundException, UseFilters } from "@nestjs/common";
import { UsersService } from "./users.service";
import { User, UserConnection } from "./entities/user.entity";
import { UserProfile, UserStats } from "./entities/user-profile.entity";
import { UpdateUserInput } from "./dto/update-user.input";
import { CurrentUser, CurrentUserType } from "../auth/decorators/CurrentUser";
import { RemovalResponse } from "../shared/entities/removal-response.entity";
import {
  mapUpdateUserInputToService,
  mapPrismaUserToGraphQL,
  mapPrismaUserConnectionToGraphQL,
} from "./utils/user-resolver-mappers";
import { mapPrismaCharacterToGraphQL } from "../characters/utils/character-resolver-mappers";
import { Character } from "../characters/entities/character.entity";
import { Gallery } from "../galleries/entities/gallery.entity";
import { Media } from "../media/entities/media.entity";
import { SocialService } from "../social/social.service";
import { ExternalAccount } from "../external-accounts/entities/external-account.entity";
import { ExternalAccountsService } from "../external-accounts/external-accounts.service";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { AllowGlobalPermission } from "../auth/decorators/AllowGlobalPermission";
import { GlobalPermission } from "../auth/GlobalPermission";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { AllowSelf } from "../auth/decorators/AllowSelf";
import { AllowGlobalAdmin } from "../auth/decorators/AllowGlobalAdmin";
import { GraphQLJSON } from "graphql-type-json";
import { Inventory } from "../items/entities/inventory.entity";
import { ItemsService } from "../items/items.service";
import { EmptyStringOnForbiddenFilter } from "../auth/filters/EmptyStringOnForbiddenFilter";
import { sentinelValueMiddleware } from "../auth/middleware/sentinel-value.middleware";
import { CommunityMember } from "../community-members/entities/community-member.entity";
import { DatabaseService } from "../database/database.service";

@Resolver(() => User)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly externalAccountsService: ExternalAccountsService,
    private readonly itemsService: ItemsService,
    private readonly database: DatabaseService,
  ) {}

  @AllowGlobalPermission(GlobalPermission.CanListUsers)
  @Query(() => UserConnection, { name: "users" })
  async findAll(
    @Args("limit", { type: () => Int, defaultValue: 20 }) limit: number,
    @Args("offset", { type: () => Int, defaultValue: 0 }) offset: number,
  ): Promise<UserConnection> {
    const serviceResult = await this.usersService.findAll(limit, offset);
    return mapPrismaUserConnectionToGraphQL(serviceResult);
  }

  @AllowUnauthenticated()
  @Query(() => User, { name: "user", nullable: true })
  async findOne(
    @Args("id", { type: () => ID, nullable: true }) id?: string,
    @Args("username", { nullable: true }) username?: string,
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

  @AllowAnyAuthenticated()
  @Query(() => User, { name: "me" })
  async getCurrentUser(@CurrentUser() user: CurrentUserType): Promise<User> {
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return mapPrismaUserToGraphQL(user);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => User)
  async updateProfile(
    @Args("input") updateUserInput: UpdateUserInput,
    @CurrentUser() user: CurrentUserType,
  ): Promise<User> {
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const serviceInput = mapUpdateUserInputToService(updateUserInput);
    const prismaResult = await this.usersService.update(user.id, serviceInput);
    return mapPrismaUserToGraphQL(prismaResult);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => RemovalResponse)
  async deleteAccount(
    @CurrentUser() user: CurrentUserType,
  ): Promise<RemovalResponse> {
    if (!user) {
      throw new NotFoundException("User not found");
    }
    await this.usersService.remove(user.id);
    return { removed: true, message: "User account successfully deleted" };
  }

  @AllowUnauthenticated()
  @Query(() => UserProfile, { name: "userProfile", nullable: true })
  async getUserProfile(
    @Args("username") username: string,
    @CurrentUser() currentUser?: CurrentUserType,
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

  @AllowUnauthenticated()
  @Query(() => UserStats, { name: "userStats" })
  async getUserStats(
    @Args("userId", { type: () => ID }) userId: string,
    @CurrentUser() currentUser?: CurrentUserType,
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

  @AllowAnyAuthenticated()
  @ResolveField("userIsFollowing", () => Boolean)
  async resolveUserIsFollowing(
    @Parent() user: User,
    @CurrentUser() currentUser?: CurrentUserType,
  ): Promise<boolean> {
    // TODO: Implement when social features are added
    return false;
  }

  // Sensitive field resolvers
  @AllowGlobalAdmin()
  @AllowSelf()
  @UseFilters(EmptyStringOnForbiddenFilter)
  @ResolveField("email", () => String, {
    middleware: [sentinelValueMiddleware],
  })
  async resolveEmail(@Parent() user: User): Promise<string> {
    return user.email;
  }

  @AllowGlobalAdmin()
  @AllowSelf()
  @ResolveField("dateOfBirth", () => Date, { nullable: true })
  async resolveDateOfBirth(@Parent() user: User): Promise<Date | null> {
    return user.dateOfBirth ?? null;
  }

  @AllowGlobalAdmin()
  @AllowSelf()
  @ResolveField("privacySettings", () => GraphQLJSON)
  async resolvePrivacySettings(@Parent() user: User): Promise<any> {
    return user.privacySettings;
  }

  @AllowGlobalAdmin()
  @AllowSelf()
  @ResolveField("canCreateCommunity", () => Boolean)
  async resolveCanCreateCommunity(@Parent() user: User): Promise<boolean> {
    return user.canCreateCommunity;
  }

  @AllowGlobalAdmin()
  @AllowSelf()
  @ResolveField("canListUsers", () => Boolean)
  async resolveCanListUsers(@Parent() user: User): Promise<boolean> {
    return user.canListUsers;
  }

  @AllowGlobalAdmin()
  @AllowSelf()
  @ResolveField("canListInviteCodes", () => Boolean)
  async resolveCanListInviteCodes(@Parent() user: User): Promise<boolean> {
    return user.canListInviteCodes;
  }

  @AllowGlobalAdmin()
  @AllowSelf()
  @ResolveField("canCreateInviteCode", () => Boolean)
  async resolveCanCreateInviteCode(@Parent() user: User): Promise<boolean> {
    return user.canCreateInviteCode;
  }

  @AllowGlobalAdmin()
  @AllowSelf()
  @ResolveField("canGrantGlobalPermissions", () => Boolean)
  async resolveCanGrantGlobalPermissions(
    @Parent() user: User,
  ): Promise<boolean> {
    return user.canGrantGlobalPermissions;
  }

  @AllowGlobalAdmin()
  @AllowSelf()
  @ResolveField("externalAccounts", () => [ExternalAccount])
  async resolveExternalAccounts(
    @Parent() user: User,
  ): Promise<ExternalAccount[]> {
    return this.externalAccountsService.findByUserId(user.id);
  }

  @AllowGlobalAdmin()
  @AllowSelf()
  @ResolveField("communityMemberships", () => [CommunityMember])
  async resolveCommunityMemberships(
    @Parent() user: User,
  ): Promise<CommunityMember[]> {
    return this.database.communityMember.findMany({
      where: { userId: user.id },
      include: { role: true },
    }) as any;
  }

  @AllowAnyAuthenticated()
  @ResolveField("inventories", () => [Inventory], {
    description: "User's inventories across different communities",
  })
  async resolveInventories(
    @Parent() user: User,
    @Args("communityId", { type: () => ID, nullable: true })
    communityId?: string,
  ): Promise<Inventory[]> {
    // Get items for the user, optionally filtered by community
    const result = await this.itemsService.findAllItems({
      ownerId: user.id,
      communityId,
    });

    if (!communityId) {
      // Group items by community
      const itemsByCommunity = new Map<string, any[]>();
      for (const item of result.items) {
        const commId = (item as any).itemType.communityId;
        if (!itemsByCommunity.has(commId)) {
          itemsByCommunity.set(commId, []);
        }
        itemsByCommunity.get(commId)!.push(item);
      }

      // Return an inventory for each community
      return Array.from(itemsByCommunity.entries()).map(([commId, items]) => ({
        communityId: commId,
        items: items as any,
        totalItems: items.length,
      }));
    }

    // Return single inventory for the specified community
    return [
      {
        communityId,
        items: result.items as any,
        totalItems: result.items.length,
      },
    ];
  }
}

// UserProfile field resolvers
@Resolver(() => UserProfile)
export class UserProfileResolver {
  constructor(private readonly usersService: UsersService) {}

  @AllowUnauthenticated()
  @ResolveField("stats", () => UserStats, {
    description: "User statistics including counts and engagement metrics",
  })
  async resolveStats(@Parent() profile: UserProfile): Promise<UserStats> {
    return { userId: profile.user.id };
  }

  @AllowUnauthenticated()
  @ResolveField("recentCharacters", () => [Character], {
    description: "Recently created or updated characters by this user",
  })
  async resolveRecentCharacters(
    @Parent() profile: UserProfile,
    @CurrentUser() currentUser?: CurrentUserType,
  ) {
    const includePrivate = profile.canViewPrivateContent;
    const characters = await this.usersService.getUserRecentCharacters(
      profile.user.id,
      includePrivate,
      6,
    );
    return characters.map(mapPrismaCharacterToGraphQL);
  }

  @AllowUnauthenticated()
  @ResolveField("recentGalleries", () => [Gallery], {
    description: "Recently created or updated galleries by this user",
  })
  async resolveRecentGalleries(
    @Parent() profile: UserProfile,
    @CurrentUser() currentUser?: CurrentUserType,
  ) {
    const includePrivate = profile.canViewPrivateContent;
    return this.usersService.getUserRecentGalleries(
      profile.user.id,
      includePrivate,
      6,
    );
  }

  @AllowUnauthenticated()
  @ResolveField("recentMedia", () => [Media], {
    description: "Recently uploaded media (images and text) by this user",
  })
  async resolveRecentMedia(@Parent() profile: UserProfile) {
    return this.usersService.getUserRecentMedia(profile.user.id, 12);
  }

  @AllowUnauthenticated()
  @ResolveField("featuredCharacters", () => [Character], {
    description: "Characters featured or highlighted by this user",
  })
  async resolveFeaturedCharacters(@Parent() profile: UserProfile) {
    const characters = await this.usersService.getUserFeaturedCharacters(
      profile.user.id,
      3,
    );
    return characters.map(mapPrismaCharacterToGraphQL);
  }
}

// UserStats field resolvers
@Resolver(() => UserStats)
export class UserStatsResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly socialService: SocialService,
  ) {}

  @AllowUnauthenticated()
  @ResolveField("charactersCount", () => Int, {
    description: "Total number of characters owned by this user",
  })
  async resolveCharactersCount(
    @Parent() stats: UserStats,
    @CurrentUser() currentUser?: CurrentUserType,
  ) {
    if (!stats.userId) return 0;
    const includePrivate =
      currentUser?.id === stats.userId || !!currentUser?.isAdmin;
    return this.usersService.getUserCharactersCount(
      stats.userId,
      includePrivate,
    );
  }

  @AllowUnauthenticated()
  @ResolveField("galleriesCount", () => Int, {
    description: "Total number of galleries created by this user",
  })
  async resolveGalleriesCount(
    @Parent() stats: UserStats,
    @CurrentUser() currentUser?: CurrentUserType,
  ) {
    if (!stats.userId) return 0;
    const includePrivate =
      currentUser?.id === stats.userId || !!currentUser?.isAdmin;
    return this.usersService.getUserGalleriesCount(
      stats.userId,
      includePrivate,
    );
  }

  @AllowUnauthenticated()
  @ResolveField("imagesCount", () => Int, {
    description: "Total number of images uploaded by this user",
  })
  async resolveImagesCount(@Parent() stats: UserStats) {
    if (!stats.userId) return 0;
    return this.usersService.getUserImagesCount(stats.userId);
  }

  @AllowUnauthenticated()
  @ResolveField("totalViews", () => Int, {
    description: "Total number of views across all user's content",
  })
  async resolveTotalViews(@Parent() stats: UserStats) {
    // TODO: Implement when views system is added
    return 0;
  }

  @AllowUnauthenticated()
  @ResolveField("totalLikes", () => Int, {
    description: "Total number of likes received across all user's content",
  })
  async resolveTotalLikes(@Parent() stats: UserStats) {
    if (!stats.userId) return 0;

    // Count likes across all content types owned by this user
    const totalLikes = await this.socialService.getUserTotalLikes(stats.userId);
    return totalLikes;
  }

  @AllowUnauthenticated()
  @ResolveField("followersCount", () => Int, {
    description: "Number of users following this user",
  })
  async resolveFollowersCount(@Parent() stats: UserStats) {
    // TODO: Implement when social features are added
    return 0;
  }

  @AllowUnauthenticated()
  @ResolveField("followingCount", () => Int, {
    description: "Number of users this user is following",
  })
  async resolveFollowingCount(@Parent() stats: UserStats) {
    // TODO: Implement when social features are added
    return 0;
  }
}
