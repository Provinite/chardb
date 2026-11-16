import { Reflector } from "@nestjs/core";

/**
 * Opens a handler gated on identity alone to requests made with a personal
 * access token.
 *
 * A token request is refused by `@AllowAnyAuthenticated()`, `@AllowSelf()`,
 * `@AllowEntityOwner()`, the owner-only branches of the character editor
 * gates, and a public mutation or non-GET route, unless the handler also
 * carries this. Gates on a community or global permission need no marking: the
 * token's own grants answer them. A handler gated on one that a token must
 * still never reach carries `RefuseAccessTokenGuard`.
 *
 * Every handler that carries it is listed in `permission-manifest.txt`. Never
 * put it on a handler that changes credentials, sessions, linked accounts or
 * tokens; `resolver-permission-coverage.spec.ts` refuses the known ones.
 */
export const AllowAccessToken = Reflector.createDecorator<true>({
  transform: () => true,
});
