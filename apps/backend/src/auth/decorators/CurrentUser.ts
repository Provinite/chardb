import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getUserFromContext } from '../utils/get-user-from-context';

// Re-export CurrentUserType for backwards compatibility
export type { CurrentUserType } from '../types/current-user.type';

/**
 * Parameter decorator to inject the current authenticated user into a resolver.
 *
 * The user is extracted from the request context (set by Passport.js during authentication).
 *
 * @example
 * ```typescript
 * @Query(() => User)
 * @UseGuards(JwtAuthGuard)
 * async me(@CurrentUser() user: CurrentUserType) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    return getUserFromContext(context);
  },
);
