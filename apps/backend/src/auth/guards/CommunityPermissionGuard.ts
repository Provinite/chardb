import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { PermissionService } from "../PermissionService";
import { CommunityResolverService } from "../services/community-resolver.service";
import { getUserFromContext } from "../utils/get-user-from-context";
import { Reflector } from "@nestjs/core";
import { AllowCommunityPermission } from "../decorators/AllowCommunityPermission";
import { ResolveCommunityFrom } from "../decorators/ResolveCommunityFrom";
import { CommunityPermission } from "../CommunityPermission";
import {
  CommunityResolutionConfig,
  CommunityResolutionReference,
} from "../types/CommunityResolutionConfig";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import type { Request } from "express";
import { getNestedValue } from "../../common/utils/getNestedValue";

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
    const community = await this.communityResolverService.resolve(resolvedIds);

    if (!community) {
      return false;
    }

    const permissions =
      await this.permissionService.getCommunityPermissionsForRequest(
        this.getRequest(context),
        user.id,
        community.id,
      );

    // Special case: CommunityPermission.Any means user just needs to be a member (have any role)
    if (requiredPermissions === CommunityPermission.Any) {
      return permissions.hasMembership;
    }

    return permissions[requiredPermissions] === true;
  }

  private getRequest(context: ExecutionContext): Request | undefined {
    if (context.getType<GqlContextType>() === "graphql") {
      return GqlExecutionContext.create(context).getContext<{
        req?: Request;
      }>().req;
    }
    return context.switchToHttp().getRequest<Request>();
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
