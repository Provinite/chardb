import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { PermissionService } from "../../auth/PermissionService";
import { CommunityResolverService } from "../../auth/services/community-resolver.service";
import { getUserFromContext } from "../../auth/utils/get-user-from-context";
import { Reflector } from "@nestjs/core";
import { RequireCommunityPermission } from "../../auth/decorators/RequireCommunityPermission";
import { ResolveCommunityFrom } from "../../auth/decorators/ResolveCommunityFrom";
import { CommunityPermission } from "../../auth/CommunityPermission";
import {
  CommunityResolutionConfig,
  CommunityResolutionReference,
} from "../../auth/types/CommunityResolutionConfig";
import { GqlExecutionContext } from "@nestjs/graphql";
import { getNestedValue } from "../utils/getNestedValue";

@Injectable()
export class CommunityPermissionGuard implements CanActivate {
  constructor(
    private permissionService: PermissionService,
    private communityResolverService: CommunityResolverService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = getUserFromContext(context);
    if (!user) {
      return false;
    }

    const requiredPermissions = this.reflector.getAllAndOverride(
      RequireCommunityPermission,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return false;
    }

    const communityResolution = this.reflector.getAllAndOverride(
      ResolveCommunityFrom,
      [context.getHandler(), context.getClass()],
    );

    if (!communityResolution) {
      throw new Error(
        "CommunityPermissionGuard requires @ResolveCommunityFrom decorator",
      );
    }

    const resolvedIds = this.resolveEntityIds(context, communityResolution);
    const community = await this.communityResolverService.resolve(resolvedIds);

    if (!community) {
      return false;
    }

    // Special case: CommunityPermission.Any means user just needs to be a member (have any role)
    if (requiredPermissions === CommunityPermission.Any) {
      const permissions = await this.permissionService.getCommunityPermissions(
        user.id,
        community.id,
      );
      return permissions.hasMembership;
    }

    return this.permissionService.hasCommunityPermission(
      user.id,
      community.id,
      requiredPermissions,
    );
  }

  private resolveEntityIds(
    context: ExecutionContext,
    config: CommunityResolutionConfig,
  ): CommunityResolutionReference {
    const gqlContext = GqlExecutionContext.create(context);
    const args = gqlContext.getArgs();

    for (const [key, path] of Object.entries(config)) {
      if (path) {
        const value = getNestedValue(args, path);
        if (value) {
          return { type: key as keyof CommunityResolutionConfig, value };
        }
      }
    }

    return { type: null, value: null };
  }
}
