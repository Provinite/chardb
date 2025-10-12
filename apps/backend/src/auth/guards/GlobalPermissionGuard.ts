import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { CurrentUserType } from "../decorators/CurrentUser";
import { GlobalPermission } from "../GlobalPermission";
import { AllowGlobalPermission } from "../decorators/AllowGlobalPermission";

/**
 * Guard that checks if the current user has a specific global permission.
 *
 * Usage:
 * 1. Mark resolver/field with @AllowGlobalPermission('permissionName')
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
 * @AllowGlobalPermission(GlobalPermission.CanCreateCommunity)
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
      AllowGlobalPermission,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermission) {
      return false;
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
        `User does not have required permission: ${requiredPermission}`
      );
    }

    return true;
  }
}
