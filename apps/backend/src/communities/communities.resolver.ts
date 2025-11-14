import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Int,
  ResolveField,
  Parent,
} from "@nestjs/graphql";
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
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { AllowGlobalPermission } from "../auth/decorators/AllowGlobalPermission";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { GlobalPermission } from "../auth/GlobalPermission";
import { User } from "../users/entities/user.entity";
import { mapPrismaUserToGraphQL } from "../users/utils/user-resolver-mappers";
import { DiscordService } from "../discord/discord.service";
import { DiscordGuildInfo } from "./dto/discord-guild-info.dto";
import { DiscordUserInfo } from "../discord/dto/discord-user-info.dto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ResolveCommunityFrom } from "../auth/decorators/ResolveCommunityFrom";
import { AllowCommunityPermission } from "../auth/decorators/AllowCommunityPermission";
import { CommunityPermission } from "../auth/CommunityPermission";

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

  @AllowUnauthenticated()
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

  @ResolveCommunityFrom({
    communityId: "communityId",
  })
  @AllowCommunityPermission(CommunityPermission.CanEditRole)
  @Query(() => DiscordGuildInfo, {
    name: "validateDiscordGuild",
    description: "Validate that the bot has access to a Discord guild",
  })
  async validateDiscordGuild(
    @Args("communityId", { type: () => ID, description: "Community ID" })
    communityId: string,
    @Args("guildId", { type: () => ID, description: "Discord guild ID" })
    guildId: string,
  ): Promise<DiscordGuildInfo> {
    const guildInfo = await this.discordService.getGuildInfo(guildId);

    if (!guildInfo) {
      throw new BadRequestException("Unable to access Discord guild");
    }

    return guildInfo;
  }

  @ResolveCommunityFrom({
    communityId: "communityId",
  })
  @AllowCommunityPermission(CommunityPermission.CanEditRole)
  @Mutation(() => Community, {
    name: "linkDiscordGuild",
    description: "Link a Discord guild to a community",
  })
  async linkDiscordGuild(
    @Args("communityId", { type: () => ID, description: "Community ID" })
    communityId: string,
    @Args("guildId", { type: () => ID, description: "Discord guild ID" })
    guildId: string,
  ): Promise<Community> {
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
      throw new BadRequestException(
        "Unable to fetch Discord guild information",
      );
    }

    // Update community with guild info
    const prismaResult = await this.communitiesService.update(communityId, {
      discordGuildId: guildId,
      discordGuildName: guildInfo.name,
    });

    return mapPrismaCommunityToGraphQL(prismaResult);
  }

  @ResolveCommunityFrom({
    communityId: "communityId",
  })
  @AllowCommunityPermission(CommunityPermission.CanEditRole)
  @Mutation(() => Community, {
    name: "unlinkDiscordGuild",
    description: "Unlink a Discord guild from a community",
  })
  async unlinkDiscordGuild(
    @Args("communityId", { type: () => ID, description: "Community ID" })
    communityId: string,
  ): Promise<Community> {
    // Remove guild association
    const prismaResult = await this.communitiesService.update(communityId, {
      discordGuildId: null,
      discordGuildName: null,
    });

    return mapPrismaCommunityToGraphQL(prismaResult);
  }

  @ResolveCommunityFrom({ communityId: "communityId" })
  @AllowCommunityPermission(CommunityPermission.CanCreateOrphanedCharacter)
  @Query(() => DiscordUserInfo, {
    name: "resolveDiscordUser",
    description:
      "Resolve a Discord username or user ID to full user information. Requires permission to create orphaned characters.",
  })
  async resolveDiscordUser(
    @Args("identifier", {
      description: "Discord username (@handle), display name, or numeric user ID",
    })
    identifier: string,
    @Args("communityId", {
      type: () => ID,
      description: "Community ID (for guild context)",
    })
    communityId: string,
  ): Promise<DiscordUserInfo> {
    // Get community to access Discord guild
    const community = await this.communitiesService.findOne(communityId);

    if (!community) {
      throw new NotFoundException(`Community with ID ${communityId} not found`);
    }

    if (!community.discordGuildId) {
      throw new BadRequestException(
        "This community does not have a Discord server connected. You must use a numeric Discord user ID (17-19 digits).",
      );
    }

    // Resolve identifier to user ID
    let userId: string;
    const trimmedIdentifier = identifier.trim();

    // Check if it's already a numeric ID (17-19 digits)
    if (/^\d{17,19}$/.test(trimmedIdentifier)) {
      userId = trimmedIdentifier;
    } else {
      // It's a username - resolve via guild
      const resolvedId = await this.discordService.resolveUsernameToId(
        community.discordGuildId,
        trimmedIdentifier,
      );

      if (!resolvedId) {
        throw new NotFoundException(
          `Discord user "${trimmedIdentifier}" not found in the server "${community.discordGuildName || community.discordGuildId}". ` +
            `Make sure the user is a member of the server and the username is spelled correctly.`,
        );
      }

      userId = resolvedId;
    }

    // Fetch and return user info
    return await this.discordService.getUserInfo(userId);
  }
}
