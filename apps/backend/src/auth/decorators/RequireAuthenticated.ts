import { Reflector } from "@nestjs/core";

/**
 * Decorator to mark a route/resolver as requiring authentication.
 *
 * This decorator works with AuthenticatedGuard to ensure only authenticated users can access the endpoint.
 * Unlike permission-based guards, this simply requires the user to be logged in.
 *
 * @example
 * ```typescript
 * @Query(() => User)
 * @RequireAuthenticated()
 * async me(@CurrentUser() user: CurrentUserType) {
 *   return user; // user is guaranteed to exist
 * }
 * ```
 */
export const RequireAuthenticated = Reflector.createDecorator<true>({
  transform: () => true,
});
