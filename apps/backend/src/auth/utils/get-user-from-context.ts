import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { CurrentUserType } from '../types/current-user.type';

/**
 * Extracts the current user from an ExecutionContext.
 *
 * This utility works for both GraphQL and REST contexts.
 * For GraphQL, it extracts the user from the GraphQL execution context.
 *
 * @param context - The NestJS ExecutionContext
 * @returns The current user or null if no user is authenticated
 *
 * @example
 * ```typescript
 * // In a guard
 * const user = getUserFromContext(context);
 * if (!user) {
 *   throw new UnauthorizedException();
 * }
 * ```
 */
export function getUserFromContext(
  context: ExecutionContext,
): CurrentUserType | null {
  const ctx = GqlExecutionContext.create(context);
  const user = ctx.getContext().req?.user;
  return user ?? null;
}
