import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getUserFromContext } from '../utils/get-user-from-context';
import { AllowAnyAuthenticated } from '../decorators/AllowAnyAuthenticated';

/**
 * Guard that checks if a user is authenticated.
 *
 * This guard checks for the {@link AllowAnyAuthenticated} decorator and verifies that
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
      AllowAnyAuthenticated,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresAuth) {
      return false;
    }

    const user = getUserFromContext(context);
    return Boolean(user);
  }
}
