import { ExecutionContext } from "@nestjs/common";
import { CurrentUserType } from "../types/current-user.type";
import { getRequestFromContext } from "./get-request-from-context";

/**
 * Extracts the current user from an ExecutionContext, for a GraphQL resolver
 * or a REST controller.
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
  const req = getRequestFromContext(context) as
    | { user?: CurrentUserType }
    | undefined;
  return req?.user ?? null;
}
