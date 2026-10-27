import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { Request } from "express";

/**
 * Each request's authentication, started by the first field to resolve.
 * Global guards run once per field resolver, so without this every resolved
 * field would verify the token and look the viewer up again. The promise is
 * kept rather than a flag because sibling fields resolve concurrently.
 */
const authentications = new WeakMap<Request, Promise<boolean>>();

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  getRequest(context: ExecutionContext): Request {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext<{ req: Request }>().req;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = this.getRequest(context);
    let authentication = authentications.get(req);
    if (!authentication) {
      authentication = super.canActivate(context) as Promise<boolean>;
      authentications.set(req, authentication);
    }
    return authentication;
  }

  // Override handleRequest to not throw errors if no token is provided
  handleRequest<TUser>(err: unknown, user: TUser | false): TUser {
    return (err || !user ? null : user) as TUser;
  }
}
