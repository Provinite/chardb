import { ExecutionContext } from "@nestjs/common";
import {
  getRequestPermissions,
  RequestPermissions,
} from "../request-permissions";
import { getRequestFromContext } from "./get-request-from-context";

/**
 * The permissions the current request was authenticated with, for a guard or
 * a parameter decorator, on a GraphQL resolver or a REST controller.
 */
export function getPermissionsFromContext(
  context: ExecutionContext,
): RequestPermissions {
  return getRequestPermissions(getRequestFromContext(context));
}
