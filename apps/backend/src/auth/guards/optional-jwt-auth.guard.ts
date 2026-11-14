import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { PermissionService } from "../PermissionService";
import { setRequestPermissions } from "../request-permissions";
import { getRequestFromContext } from "../utils/get-request-from-context";
import type { CurrentUserType } from "../types/current-user.type";

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
  constructor(private readonly permissionService: PermissionService) {
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
    // graphql-ws builds the context from connectionParams, so a subscription
    // has no req; it goes on as anonymous
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
    const authenticated = await (super.canActivate(
      context,
    ) as Promise<boolean>);
    const user = (req as Request & { user?: CurrentUserType }).user;
    setRequestPermissions(req, this.permissionService.forUser(user));
    return authenticated;
  }

  // Override handleRequest to not throw errors if no token is provided
  handleRequest<TUser>(err: unknown, user: TUser | false): TUser {
    return (err || !user ? null : user) as TUser;
  }
}
