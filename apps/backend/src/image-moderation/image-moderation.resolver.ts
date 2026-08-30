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
import { UseGuards } from "@nestjs/common";
import { ImageModerationService } from "./image-moderation.service";
import { DatabaseService } from "../database/database.service";
import { CurrencyTransactionSource } from "@prisma/client";
import { CurrencyTransaction } from "../currencies/entities/currency-transaction.entity";
import { mapPrismaCurrencyTransactionToGraphQL } from "../currencies/utils/currency-resolver-mappers";
import { MediaService } from "../media/media.service";
import {
  ImageModerationAction,
  ImageModerationQueueConnection,
} from "./entities/image-moderation-action.entity";
import { MediaConnection } from "../media/entities/media.entity";
import {
  ImageModerationQueueFiltersInput,
  ApproveImageInput,
  RejectImageInput,
} from "./dto/image-moderation.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { AllowGlobalAdmin } from "../auth/decorators/AllowGlobalAdmin";
import { AllowCommunityPermission } from "../auth/decorators/AllowCommunityPermission";
import { CommunityPermission } from "../auth/CommunityPermission";
import { ResolveCommunityFrom } from "../auth/decorators/ResolveCommunityFrom";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { mapPrismaMediaConnectionToGraphQL } from "../media/utils/media-resolver-mappers";
import {
  mapQueueResultToGraphQL,
  mapPrismaImageModerationActionToGraphQL,
} from "./utils/image-moderation-mappers";

@Resolver()
export class ImageModerationResolver {
  constructor(
    private readonly imageModerationService: ImageModerationService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * Get pending images for a community's moderation queue
   */
  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanModerateImages)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @UseGuards(JwtAuthGuard)
  @Query(() => ImageModerationQueueConnection, {
    description: "Get pending images for a community moderation queue",
  })
  async imageModerationQueue(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("filters", { nullable: true })
    filters: ImageModerationQueueFiltersInput,
    @Args("first", { nullable: true, defaultValue: 20, type: () => Int })
    first: number,
    @Args("offset", { nullable: true, defaultValue: 0, type: () => Int })
    offset: number,
  ): Promise<ImageModerationQueueConnection> {
    const result = await this.imageModerationService.getQueueForCommunity(
      communityId,
      filters,
      first,
      offset,
    );
    return mapQueueResultToGraphQL(result);
  }

  /**
   * Get pending media for a community's moderation queue (returns Media objects)
   * Use this query to access media with pendingModerationImage field for actual image URLs
   */
  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanModerateImages)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @UseGuards(JwtAuthGuard)
  @Query(() => MediaConnection, {
    description:
      "Get pending media for moderation queue (use pendingModerationImage field for actual image URLs)",
  })
  async mediaModerationQueue(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("first", { nullable: true, defaultValue: 20, type: () => Int })
    first: number,
    @Args("offset", { nullable: true, defaultValue: 0, type: () => Int })
    offset: number,
  ): Promise<MediaConnection> {
    const result = await this.mediaService.findPendingForModeration(
      communityId,
      first,
      offset,
    );
    return mapPrismaMediaConnectionToGraphQL(result);
  }

  /**
   * Get all pending images (global admin only)
   */
  @AllowGlobalAdmin()
  @UseGuards(JwtAuthGuard)
  @Query(() => ImageModerationQueueConnection, {
    description: "Get all pending images across all communities (admin only)",
  })
  async globalImageModerationQueue(
    @Args("filters", { nullable: true })
    filters: ImageModerationQueueFiltersInput,
    @Args("first", { nullable: true, defaultValue: 20, type: () => Int })
    first: number,
    @Args("offset", { nullable: true, defaultValue: 0, type: () => Int })
    offset: number,
  ): Promise<ImageModerationQueueConnection> {
    const result = await this.imageModerationService.getGlobalQueue(
      filters,
      first,
      offset,
    );
    return mapQueueResultToGraphQL(result);
  }

  /**
   * Get pending image count for a community
   */
  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanModerateImages)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @UseGuards(JwtAuthGuard)
  @Query(() => Int, {
    description: "Get count of pending images for a community",
  })
  async pendingImageCount(
    @Args("communityId", { type: () => ID }) communityId: string,
  ): Promise<number> {
    return this.imageModerationService.getPendingCountForCommunity(communityId);
  }

  /**
   * Get global pending image count (admin only)
   */
  @AllowGlobalAdmin()
  @UseGuards(JwtAuthGuard)
  @Query(() => Int, {
    description:
      "Get count of all pending images across all communities (admin only)",
  })
  async globalPendingImageCount(): Promise<number> {
    return this.imageModerationService.getGlobalPendingCount();
  }

  /**
   * Approve an image
   */
  @AllowAnyAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Mutation(() => ImageModerationAction, {
    description: "Approve an image (moderator action)",
  })
  async approveImage(
    @Args("input") input: ApproveImageInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<ImageModerationAction> {
    const action = await this.imageModerationService.approveImage(
      input.imageId,
      user.id,
      {
        currencyId: input.currencyId,
        awards: input.awards,
        staffNote: input.staffNote,
      },
    );
    return mapPrismaImageModerationActionToGraphQL(action);
  }

  /**
   * Reject an image
   */
  @AllowAnyAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Mutation(() => ImageModerationAction, {
    description: "Reject an image (moderator action)",
  })
  async rejectImage(
    @Args("input") input: RejectImageInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<ImageModerationAction> {
    const action = await this.imageModerationService.rejectImage(
      input.imageId,
      user.id,
      input.reason,
      input.reasonText,
    );
    return mapPrismaImageModerationActionToGraphQL(action);
  }
}

/**
 * What an approval actually paid out.
 *
 * Read back from the ledger rather than stored on the moderation row, so
 * there is exactly one record of the money and it cannot disagree with
 * itself. This is what the `source` / `sourceId` columns on a currency
 * transaction are for: without them the only way to find the coin an approval
 * created would be to match on reason text.
 */
@Resolver(() => ImageModerationAction)
export class ImageModerationActionFieldsResolver {
  constructor(private readonly database: DatabaseService) {}

  @AllowAnyAuthenticated()
  @ResolveField(() => [CurrencyTransaction], {
    name: "currencyAwards",
    description:
      "Currency granted because this image was approved. Empty for a " +
      "rejection, or when nothing was awarded.",
  })
  async resolveCurrencyAwards(
    @Parent() action: ImageModerationAction,
  ): Promise<CurrencyTransaction[]> {
    // Two hops, because the ledger records the media rather than the image.
    // That is the cost of pointing a member's statement at something they can
    // actually look at, and it is paid here -- on an audit read -- rather than
    // on the page every member sees.
    const media = await this.database.media.findMany({
      where: { imageId: action.imageId },
      select: { id: true },
    });
    if (media.length === 0) return [];

    const rows = await this.database.currencyTransaction.findMany({
      where: {
        source: CurrencyTransactionSource.MEDIA_APPROVAL,
        sourceId: { in: media.map((m) => m.id) },
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapPrismaCurrencyTransactionToGraphQL);
  }
}
