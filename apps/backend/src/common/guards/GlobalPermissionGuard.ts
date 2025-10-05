import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { CurrentUserType } from "../../auth/decorators/current-user.decorator";
import { GlobalPermission } from "../../auth/GlobalPermission";
import { RequireGlobalPermission } from "../../auth/decorators/RequireGlobalPermission";

/**
 * Guard that checks if the current user has a specific global permission.
 *
 * Usage:
 * 1. Mark resolver/field with @RequireGlobalPermission('permissionName')
 * 2. Add @UseGuards(JwtAuthGuard, GlobalPermissionGuard) to ensure user is authenticated first
 *
 * The guard will:
 * - Extract the required permission from metadata
 * - Check if current user has that permission
 * - Throw UnauthorizedException if permission check fails
 *
 * @example
 * ```typescript
 * @Mutation(() => Community)
 * @UseGuards(JwtAuthGuard, GlobalPermissionGuard)
 * @RequireGlobalPermission(GlobalPermission.CanCreateCommunity)
 * async createCommunity(@CurrentUser() user: CurrentUserType) {
 *   // user is guaranteed to have canCreateCommunity permission
 * }
 * ```
 */
@Injectable()
export class GlobalPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the required permission from metadata
    const requiredPermission = this.reflector.getAllAndOverride(
      RequireGlobalPermission,
      [context.getHandler(), context.getClass()],
    );

    // If no permission is required, allow access
    if (!requiredPermission) {
      return true;
    }

    // Extract user from GraphQL context
    const ctx = GqlExecutionContext.create(context);
    const user: CurrentUserType = ctx.getContext().req.user;

    // User must be authenticated (should be handled by JwtAuthGuard first)
    if (!user) {
      return false;
    }

    // Check if user has the required permission
    const hasPermission = user[requiredPermission] === true;

    if (!hasPermission) {
      throw new Error(
        `User does not have required permission: ${requiredPermission}`,
      );
    }

    return true;
  }
}
