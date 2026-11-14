import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { getPermissionsFromContext } from "../utils/get-permissions-from-context";

export type { RequestPermissions } from "../request-permissions";

/**
 * Parameter decorator for what the caller may do. Always present: a caller
 * who is not signed in gets permissions that allow nothing.
 *
 * @example
 * ```typescript
 * async deleteComment(
 *   @CurrentUser() user: AuthenticatedCurrentUserType,
 *   @CurrentPermissions() permissions: RequestPermissions,
 * ) {
 *   if (permissions.isAdmin) { ... }
 * }
 * ```
 */
export const CurrentPermissions = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    getPermissionsFromContext(context),
);
