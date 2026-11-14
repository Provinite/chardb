import { ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import {
  getRequestPermissions,
  RequestPermissions,
} from "../request-permissions";

/**
 * The permissions the current request was authenticated with, for a guard.
 * Reads the request the way `getUserFromContext` does, so the two always
 * describe the same caller.
 */
export function getPermissionsFromContext(
  context: ExecutionContext,
): RequestPermissions {
  const ctx = GqlExecutionContext.create(context);
  return getRequestPermissions(ctx.getContext<{ req?: object }>()?.req);
}
