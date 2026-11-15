import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { CommunityResolverService } from "../services/community-resolver.service";
import { getUserFromContext } from "../utils/get-user-from-context";
import { getPermissionsFromContext } from "../utils/get-permissions-from-context";
import { Reflector } from "@nestjs/core";
import { AllowCommunityPermission } from "../decorators/AllowCommunityPermission";
import { ResolveCommunityFrom } from "../decorators/ResolveCommunityFrom";
import {
  CommunityResolutionConfig,
  CommunityResolutionReference,
} from "../types/CommunityResolutionConfig";
import { GqlExecutionContext } from "@nestjs/graphql";
import { getRequestFromContext } from "../utils/get-request-from-context";
import { getNestedValue } from "../../common/utils/getNestedValue";

@Injectable()
export class CommunityPermissionGuard implements CanActivate {
  constructor(
    private communityResolverService: CommunityResolverService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = getUserFromContext(context);
    if (!user) {
      return false;
    }

    const requiredPermissions = this.reflector.getAllAndOverride(
      AllowCommunityPermission,
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
    // The request lets field resolvers on a list share their lookups.
    const community = await this.communityResolverService.resolve(
      resolvedIds,
      getRequestFromContext(context),
    );

    if (!community) {
      return false;
    }

    return getPermissionsFromContext(context).hasInCommunity(
      community.id,
      requiredPermissions,
    );
  }

  private resolveEntityIds(
    context: ExecutionContext,
    config: CommunityResolutionConfig,
  ): CommunityResolutionReference {
    const gqlContext = GqlExecutionContext.create(context);

    for (const [key, path] of Object.entries(config)) {
      if (!path) continue;

      // Handle $root.propertyName syntax for field resolvers
      if (path.startsWith("$root.")) {
        const parent = gqlContext.getRoot();
        const propertyPath = path.slice(6); // Remove "$root." prefix
        const value = getNestedValue(parent, propertyPath);
        if (value) {
          return { type: key as keyof CommunityResolutionConfig, value };
        }
      } else {
        // Handle normal argument paths
        const args = gqlContext.getArgs();
        const value = getNestedValue(args, path);
        if (value) {
          return { type: key as keyof CommunityResolutionConfig, value };
        }
      }
    }

    return { type: null, value: null };
  }
}
