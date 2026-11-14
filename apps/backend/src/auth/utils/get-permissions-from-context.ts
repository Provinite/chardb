import { ExecutionContext } from "@nestjs/common";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import {
  getRequestPermissions,
  RequestPermissions,
} from "../request-permissions";

/**
 * The permissions the current request was authenticated with, for a guard or
 * a parameter decorator, on a GraphQL resolver or a REST controller.
 */
export function getPermissionsFromContext(
  context: ExecutionContext,
): RequestPermissions {
  if (context.getType<GqlContextType>() === "graphql") {
    return getRequestPermissions(
      GqlExecutionContext.create(context).getContext<{ req?: object }>()?.req,
    );
  }
  return getRequestPermissions(context.switchToHttp().getRequest<object>());
}
