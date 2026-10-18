import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AllowCommunityPermission } from "../../auth/decorators/AllowCommunityPermission";
import { ResolveCommunityFrom } from "../../auth/decorators/ResolveCommunityFrom";
import { CurrentUser } from "../../auth/decorators/CurrentUser";
import { CommunityPermission } from "../../auth/CommunityPermission";
import type { AuthenticatedCurrentUserType } from "../../auth/types/current-user.type";
import { HalloweenAdminService } from "./halloween-admin.service";
import {
  CreateHalloweenPrizeInput,
  HalloweenSettingsInput,
  UpdateHalloweenPrizeInput,
} from "./halloween-admin.inputs";
import {
  HalloweenEventSettings,
  HalloweenPrizeView,
} from "./halloween-dashboard.types";
import { ItemType } from "../../items/entities/item-type.entity";
import { mapPrismaItemTypeToGraphQL } from "../../items/utils/item-type-resolver-mappers";
import { Character } from "../../characters/entities/character.entity";
import { mapPrismaCharacterToGraphQL } from "../../characters/utils/character-resolver-mappers";

/**
 * Running the Halloween event from chardb. Gated on `canManageItems`: this is
 * deciding what exists to be won, as defining item types is.
 */
@Resolver()
export class HalloweenAdminResolver {
  constructor(private readonly admin: HalloweenAdminService) {}

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Mutation(() => HalloweenEventSettings, {
    description:
      "Set the Halloween event's dates, knocks per day, reset hour, win rate " +
      "and win channel. Creates them the first time.",
  })
  async updateHalloweenSettings(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("input") input: HalloweenSettingsInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenEventSettings> {
    return this.admin.updateSettings(communityId, input, user.id);
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Mutation(() => HalloweenPrizeView, {
    description: "Add a prize to the Halloween event's pool",
  })
  async createHalloweenPrize(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("input") input: CreateHalloweenPrizeInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenPrizeView> {
    return this.admin.createPrize(communityId, input, user.id);
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Mutation(() => HalloweenPrizeView, {
    description:
      "Change a Halloween prize's name, weight, stock or (for a prize staff " +
      "hand over) image",
  })
  async updateHalloweenPrize(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("prizeId", { type: () => ID }) prizeId: string,
    @Args("input") input: UpdateHalloweenPrizeInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenPrizeView> {
    return this.admin.updatePrize(communityId, prizeId, input, user.id);
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Mutation(() => Boolean, {
    description:
      "Remove a Halloween prize nobody has won. A won prize stays on record.",
  })
  async removeHalloweenPrize(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("prizeId", { type: () => ID }) prizeId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.admin.removePrize(communityId, prizeId, user.id);
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => [ItemType], {
    description:
      "Item types of the community a new Halloween prize could hand over, " +
      "by name (25 per search)",
  })
  async halloweenPrizeItemTypes(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("search") search: string,
  ): Promise<ItemType[]> {
    const itemTypes = await this.admin.prizeItemTypes(communityId, search);
    return itemTypes.map(mapPrismaItemTypeToGraphQL);
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => [Character], {
    description:
      "Characters of the community a new Halloween prize could hand over, by " +
      "name: no owner, no pending owner, and not a prize already (25 per search)",
  })
  async halloweenPrizeCharacters(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("search") search: string,
  ): Promise<Character[]> {
    const characters = await this.admin.prizeCharacters(communityId, search);
    return characters.map(mapPrismaCharacterToGraphQL);
  }
}
