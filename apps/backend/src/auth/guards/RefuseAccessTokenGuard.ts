import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { getRequestAccessTokenId } from "../access-token-request";
import { getRequestFromContext } from "../utils/get-request-from-context";

/**
 * Turns away every request made with a personal access token, whatever the
 * token was granted. Put on a handler with `@UseGuards()`, it must pass as
 * well as the handler's `@Allow*` gate.
 *
 * For a handler a token must never reach that is gated on a permission a
 * token can be granted: a global permission or a community one. Gates on
 * identity alone refuse a token already; see `refusesAccessToken`.
 */
@Injectable()
export class RefuseAccessTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return !getRequestAccessTokenId(getRequestFromContext(context));
  }
}
