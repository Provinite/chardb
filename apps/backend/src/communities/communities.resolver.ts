import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from "@nestjs/graphql";
import { CommunitiesService } from "./communities.service";
import { Community, CommunityConnection } from "./entities/community.entity";
import {
  CreateCommunityInput,
  UpdateCommunityInput,
} from "./dto/community.dto";
import {
  mapCreateCommunityInputToService,
  mapUpdateCommunityInputToService,
  mapPrismaCommunityToGraphQL,
  mapPrismaCommunityConnectionToGraphQL,
} from "./utils/community-resolver-mappers";
import { RemovalResponse } from "../shared/entities/removal-response.entity";
import { CurrentUser, CurrentUserType } from "../auth/decorators/CurrentUser";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { AllowGlobalPermission } from "../auth/decorators/AllowGlobalPermission";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { GlobalPermission } from "../auth/GlobalPermission";
import { User } from "../users/entities/user.entity";
import { mapPrismaUserToGraphQL } from "../users/utils/user-resolver-mappers";
import { DiscordService } from "../discord/discord.service";
import { DiscordGuildInfo } from "./dto/discord-guild-info.dto";
import { ForbiddenException, BadRequestException } from "@nestjs/common";

@Resolver(() => Community)
export class CommunitiesResolver {
  constructor(
    private readonly communitiesService: CommunitiesService,
    private readonly discordService: DiscordService,
  ) {}

  @AllowGlobalPermission(GlobalPermission.CanCreateCommunity)
  @Mutation(() => Community, { description: "Create a new community" })
  async createCommunity(
    @Args("createCommunityInput", { description: "Community creation data" })
    createCommunityInput: CreateCommunityInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<Community> {
    const serviceInput = mapCreateCommunityInputToService(
      createCommunityInput,
      user.id,
    );
    const prismaResult = await this.communitiesService.create(serviceInput);
    return mapPrismaCommunityToGraphQL(prismaResult);
  }

  @AllowAnyAuthenticated()
  @Query(() => CommunityConnection, {
    name: "communities",
    description: "Get all communities with pagination",
  })
  async findAll(
    @Args("first", {
      type: () => Int,
      nullable: true,
      description: "Number of communities to return",
      defaultValue: 20,
    })
    first?: number,
    @Args("after", {
      type: () => String,
      nullable: true,
      description: "Cursor for pagination",
    })
    after?: string,
  ): Promise<CommunityConnection> {
    const serviceResult = await this.communitiesService.findAll(first, after);
    return mapPrismaCommunityConnectionToGraphQL(serviceResult);
  }

  @AllowAnyAuthenticated()
  @Query(() => Community, {
    name: "community",
    description: "Get a community by ID",
  })
  async findOne(
    @Args("id", { type: () => ID, description: "Community ID" })
    id: string,
  ): Promise<Community> {
    const prismaResult = await this.communitiesService.findOne(id);
    return mapPrismaCommunityToGraphQL(prismaResult);
  }

  @AllowGlobalPermission(GlobalPermission.CanCreateCommunity)
  @Mutation(() => Community, { description: "Update a community" })
  async updateCommunity(
    @Args("id", { type: () => ID, description: "Community ID" })
    id: string,
    @Args("updateCommunityInput", { description: "Community update data" })
    updateCommunityInput: UpdateCommunityInput,
  ): Promise<Community> {
    const serviceInput = mapUpdateCommunityInputToService(updateCommunityInput);
    const prismaResult = await this.communitiesService.update(id, serviceInput);
    return mapPrismaCommunityToGraphQL(prismaResult);
  }

  @AllowGlobalPermission(GlobalPermission.CanCreateCommunity)
  @Mutation(() => RemovalResponse, { description: "Remove a community" })
  async removeCommunity(
    @Args("id", { type: () => ID, description: "Community ID" })
    id: string,
  ): Promise<RemovalResponse> {
    await this.communitiesService.remove(id);
    return { removed: true, message: "Community successfully removed" };
  }

  @AllowAnyAuthenticated()
  @ResolveField("members", () => [User], {
    description: "Community members with optional search filtering",
  })
  async resolveMembers(
    @Parent() community: Community,
    @Args("search", { type: () => String, nullable: true }) search?: string,
    @Args("limit", { type: () => Int, defaultValue: 10 }) limit?: number,
  ): Promise<User[]> {
    const members = await this.communitiesService.getMembers(community.id, {
      search,
      limit,
    });
    return members.map(mapPrismaUserToGraphQL);
  }

  // Discord Integration

  @AllowAnyAuthenticated()
  @Query(() => String, {
    name: "discordBotInviteUrl",
    description: "Get the Discord bot invite URL",
  })
  async getDiscordBotInviteUrl(): Promise<string> {
    return this.discordService.generateBotInviteUrl();
  }

  @AllowAnyAuthenticated()
  @Query(() => DiscordGuildInfo, {
    name: "validateDiscordGuild",
    description: "Validate that the bot has access to a Discord guild",
  })
  async validateDiscordGuild(
    @Args("guildId", { type: () => ID, description: "Discord guild ID" })
    guildId: string,
  ): Promise<DiscordGuildInfo> {
    const guildInfo = await this.discordService.getGuildInfo(guildId);

    if (!guildInfo) {
      throw new BadRequestException("Unable to access Discord guild");
    }

    return guildInfo;
  }

  @AllowAnyAuthenticated()
  @Mutation(() => Community, {
    name: "linkDiscordGuild",
    description: "Link a Discord guild to a community",
  })
  async linkDiscordGuild(
    @Args("communityId", { type: () => ID, description: "Community ID" })
    communityId: string,
    @Args("guildId", { type: () => ID, description: "Discord guild ID" })
    guildId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<Community> {
    // Check if user has permission to edit this community
    // For now, using global permission as a simple check
    // TODO: Implement community-specific permission checking
    const hasPermission = await this.communitiesService.userCanEditCommunity(
      user.id,
      communityId,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        "You do not have permission to edit this community",
      );
    }

    // Verify bot has access to the guild
    const hasAccess = await this.discordService.verifyGuildAccess(guildId);
    if (!hasAccess) {
      throw new BadRequestException(
        "Bot does not have access to this Discord server. Please add the bot first.",
      );
    }

    // Get guild info
    const guildInfo = await this.discordService.getGuildInfo(guildId);
    if (!guildInfo) {
      throw new BadRequestException("Unable to fetch Discord guild information");
    }

    // Update community with guild info
    const prismaResult = await this.communitiesService.update(communityId, {
      discordGuildId: guildId,
      discordGuildName: guildInfo.name,
    });

    return mapPrismaCommunityToGraphQL(prismaResult);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => Community, {
    name: "unlinkDiscordGuild",
    description: "Unlink a Discord guild from a community",
  })
  async unlinkDiscordGuild(
    @Args("communityId", { type: () => ID, description: "Community ID" })
    communityId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<Community> {
    // Check if user has permission to edit this community
    const hasPermission = await this.communitiesService.userCanEditCommunity(
      user.id,
      communityId,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        "You do not have permission to edit this community",
      );
    }

    // Remove guild association
    const prismaResult = await this.communitiesService.update(communityId, {
      discordGuildId: null,
      discordGuildName: null,
    });

    return mapPrismaCommunityToGraphQL(prismaResult);
  }
}
