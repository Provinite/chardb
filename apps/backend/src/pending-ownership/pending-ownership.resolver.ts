import { Resolver, ResolveField, Parent } from "@nestjs/graphql";
import { UseFilters, UseGuards } from "@nestjs/common";
import { PendingOwnership } from "./entities/pending-ownership.entity";
import { AllowGlobalAdmin } from "../auth/decorators/AllowGlobalAdmin";
import { AllowCommunityPermission } from "../auth/decorators/AllowCommunityPermission";
import { ResolveCommunityFrom } from "../auth/decorators/ResolveCommunityFrom";
import { CommunityPermission } from "../auth/CommunityPermission";
import { NullOnForbiddenFilter } from "../auth/filters/NullOnForbiddenFilter";
import { sentinelValueMiddleware } from "../auth/middleware/sentinel-value.middleware";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CommunityPermissionGuard } from "../auth/guards/CommunityPermissionGuard";

/**
 * Resolver for permission-based field resolution on PendingOwnership.
 *
 * This resolver provides field-level permission checking for sensitive fields
 * (providerAccountId, displayIdentifier) that should only be visible to users
 * with the CanCreateOrphanedCharacter permission in the relevant community.
 *
 * Users without permission will see null for these fields instead of an error.
 */
@Resolver(() => PendingOwnership)
export class PendingOwnershipResolver {
  /**
   * Resolve the providerAccountId field with permission checking.
   *
   * Returns null if the user doesn't have CanCreateOrphanedCharacter permission.
   */
  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanCreateOrphanedCharacter)
  @ResolveCommunityFrom({ pendingOwnershipId: "$root.id" })
  @UseGuards(JwtAuthGuard, CommunityPermissionGuard)
  @UseFilters(NullOnForbiddenFilter)
  @ResolveField("providerAccountId", () => String, {
    middleware: [sentinelValueMiddleware],
  })
  async resolveProviderAccountId(
    @Parent() pending: PendingOwnership,
  ): Promise<string> {
    return pending.providerAccountId;
  }

  /**
   * Resolve the displayIdentifier field with permission checking.
   *
   * Returns null if the user doesn't have CanCreateOrphanedCharacter permission.
   */
  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanCreateOrphanedCharacter)
  @ResolveCommunityFrom({ pendingOwnershipId: "$root.id" })
  @UseGuards(JwtAuthGuard, CommunityPermissionGuard)
  @UseFilters(NullOnForbiddenFilter)
  @ResolveField("displayIdentifier", () => String, {
    nullable: true,
    middleware: [sentinelValueMiddleware],
  })
  async resolveDisplayIdentifier(
    @Parent() pending: PendingOwnership,
  ): Promise<string | null> {
    return pending.displayIdentifier;
  }
}
