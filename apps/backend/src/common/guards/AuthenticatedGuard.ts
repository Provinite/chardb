import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { getUserFromContext } from "../../auth/utils/get-user-from-context";
import { RequireAuthenticated } from "../../auth/decorators/RequireAuthenticated";

/**
 * Guard that checks if a user is authenticated.
 *
 * This guard checks for the @RequireAuthenticated decorator and verifies that
 * req.user exists (populated by OptionalJwtAuthGuard).
 *
 * Unlike permission guards, this only checks if the user is logged in,
 * not what permissions they have.
 */
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if the route requires authentication
    const requiresAuth = this.reflector.getAllAndOverride(
      RequireAuthenticated,
      [context.getHandler(), context.getClass()],
    );

    // If no authentication required, allow access
    if (!requiresAuth) {
      return true;
    }

    // Check if user exists
    const user = getUserFromContext(context);
    return !!user;
  }
}
