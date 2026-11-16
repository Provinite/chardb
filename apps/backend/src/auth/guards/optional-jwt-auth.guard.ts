import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { PermissionService } from "../PermissionService";
import { setRequestPermissions } from "../request-permissions";
import { getRequestFromContext } from "../utils/get-request-from-context";
import type { CurrentUserType } from "../types/current-user.type";
import { trace } from "@opentelemetry/api";
import { setRequestAccessToken } from "../access-token-request";
import {
  bearerCredential,
  isAccessTokenSecret,
} from "../personal-access-tokens/access-token-secret";
import { PersonalAccessTokensService } from "../personal-access-tokens/personal-access-tokens.service";

/**
 * Each request's authentication, started by the first field to resolve.
 * Global guards run once per field resolver, so without this every resolved
 * field would verify the token and look the viewer up again. The promise is
 * kept rather than a flag because sibling fields resolve concurrently.
 */
const authentications = new WeakMap<Request, Promise<boolean>>();

/** The guard was built somewhere that provides no PermissionService. */
export class MissingPermissionServiceError extends Error {
  constructor() {
    super("OptionalJwtAuthGuard was built without a PermissionService");
    this.name = "MissingPermissionServiceError";
  }
}

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly accessTokens: PersonalAccessTokensService,
  ) {
    super();
    // AuthGuard marks its own first constructor argument optional and this
    // class inherits the mark, so Nest injects undefined where it finds no
    // PermissionService. Refuse at startup, not on the first request.
    if (!permissionService) throw new MissingPermissionServiceError();
  }

  getRequest(context: ExecutionContext): Request | undefined {
    return getRequestFromContext(context);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = this.getRequest(context);
    // Nothing to authenticate against; it goes on as anonymous. A
    // subscription does not come this way: see getRequestFromContext.
    if (!req) return true;

    let authentication = authentications.get(req);
    if (!authentication) {
      authentication = this.authenticate(context, req);
      authentications.set(req, authentication);
    }
    return authentication;
  }

  /**
   * Sets `req.user`, then the permissions the request acts with. This is
   * where a request's permissions are decided: every guard, resolver and
   * service reads them back from here.
   */
  private async authenticate(
    context: ExecutionContext,
    req: Request,
  ): Promise<boolean> {
    const credential = bearerCredential(req);
    if (credential && isAccessTokenSecret(credential)) {
      return this.authenticateAccessToken(req, credential);
    }

    const authenticated = await (super.canActivate(
      context,
    ) as Promise<boolean>);
    const user = (req as Request & { user?: CurrentUserType }).user;
    setRequestPermissions(req, this.permissionService.forUser(user));
    return authenticated;
  }

  /**
   * A personal access token acts as its owner, with its own grants in place
   * of the owner's permissions. A token that is refused fails the request,
   * where a bad session goes on anonymous: a script holding a dead token
   * should hear so, not be told every field is forbidden.
   *
   * @throws InvalidAccessTokenError
   */
  private async authenticateAccessToken(
    req: Request,
    secret: string,
  ): Promise<boolean> {
    const { tokenId, user, grants, globalPermissions } =
      await this.accessTokens.authenticate(secret);
    (req as Request & { user?: CurrentUserType }).user = user;
    setRequestPermissions(
      req,
      this.permissionService.forAccessToken(user, grants, globalPermissions),
    );
    setRequestAccessToken(req, tokenId);
    trace.getActiveSpan()?.setAttribute("auth.access_token_id", tokenId);
    return true;
  }

  // Override handleRequest to not throw errors if no token is provided
  handleRequest<TUser>(err: unknown, user: TUser | false): TUser {
    return (err || !user ? null : user) as TUser;
  }
}
