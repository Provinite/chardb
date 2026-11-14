import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AllowGlobalPermission } from "../decorators/AllowGlobalPermission";
import { getPermissionsFromContext } from "../utils/get-permissions-from-context";

/**
 * Guard that checks if the caller holds a specific global permission.
 *
 * Works with `@AllowGlobalPermission(permission)` and `@AllowGlobalAdmin()`.
 * A handler without either is not this guard's to admit.
 *
 * @example
 * ```typescript
 * @Mutation(() => Community)
 * @AllowGlobalPermission(GlobalPermission.CanCreateCommunity)
 * async createCommunity(@CurrentUser() user: CurrentUserType) {
 *   // the caller is guaranteed to hold canCreateCommunity
 * }
 * ```
 */
@Injectable()
export class GlobalPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride(
      AllowGlobalPermission,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return false;
    }

    return getPermissionsFromContext(context).hasGlobal(requiredPermission);
  }
}
