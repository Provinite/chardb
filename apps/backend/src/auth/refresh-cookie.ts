import type { CookieOptions, Request, Response } from "express";

/**
 * The refresh token's transport.
 *
 * It used to live in `localStorage` and travel as a mutation argument, which
 * worked while the whole app was one origin. Community subdomains end that:
 * `localStorage` is scoped per origin, so a member signed in at `chardb.cc`
 * arrived at `willowmere.chardb.cc` signed out, and signing in there signed
 * them in nowhere else (#339).
 *
 * A cookie scoped to the parent domain is sent to every host under it,
 * including `api.chardb.cc`, so one sign-in covers the apex and every
 * community. Because all of those share a registrable domain the request is
 * same-site, which is why `SameSite=Lax` is sufficient here and no
 * `SameSite=None` -- with the third-party exposure that carries -- is needed.
 *
 * `HttpOnly` is the other half of the trade: script can no longer read the
 * refresh token, which is a straight improvement over `localStorage`, and is
 * why the value is never returned to the client any more.
 */
/**
 * Named per root domain, e.g. `chardb_session_chardb_cc`.
 *
 * Because staging lives at `dev.chardb.cc`, a subdomain of production, the
 * production cookie is scoped `Domain=.chardb.cc` and is therefore sent to
 * staging as well -- that is what makes community subdomains work and it
 * cannot be narrowed. Sharing a NAME on top of that is what turns an exposure
 * into an attack: a subdomain can set a cookie for its parent, the `Cookie`
 * header carries no domain to tell two same-named cookies apart, and the
 * server picks one arbitrarily. Distinct names mean staging cannot shadow
 * production's session, and neither environment reads a cookie belonging to
 * the other.
 *
 * This is a mitigation, not a fix: the credential still crosses the boundary.
 * The fix is moving staging off the production registrable domain.
 *
 * Derived rather than configured so the two can never drift: the cookie is
 * scoped to this domain, so its name is a function of the same value.
 */
export const refreshCookieName = (): string =>
  `chardb_session_${(process.env.ROOT_DOMAIN || "localhost").replace(/[^a-z0-9]+/gi, "_")}`;

/**
 * Matches the 7-day expiry `AuthService` signs the refresh token with. The
 * cookie outliving the token would leave the client believing it has a session
 * it cannot renew.
 */
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The domain the cookie is pinned to, with a leading dot so every subdomain
 * receives it -- the apex, `api.`, and every community.
 *
 * Bare `localhost` is the one value that cannot work: it is a public suffix,
 * so browsers reject a `Domain` attribute on it and, worse, treat
 * `api.localhost` and `willowmere.localhost` as different *sites*, which
 * `SameSite=Lax` then stops the cookie crossing. Development therefore runs
 * under `dev.localhost` (see `scripts/instance.mjs`), where the label below it
 * makes them one site exactly as production is. Left host-only if someone does
 * set it to `localhost`, which signs each host in separately rather than
 * failing silently in a harder-to-read way.
 */
const cookieDomain = (): string | undefined => {
  const root = process.env.ROOT_DOMAIN;
  if (!root || root === "localhost") return undefined;
  return `.${root}`;
};

const baseOptions = (): CookieOptions => ({
  httpOnly: true,
  // Not over plain http in development, where there is no TLS to attach to.
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  domain: cookieDomain(),
  path: "/",
});

/** Issue or rotate the refresh cookie on a response. */
export const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(refreshCookieName(), token, {
    ...baseOptions(),
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
};

/**
 * Clear the refresh cookie.
 *
 * The attributes have to match the ones it was set with -- a browser matches a
 * clearing cookie on name, domain and path -- which is the reason both live in
 * `baseOptions` rather than being spelled out at each call site.
 */
export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(refreshCookieName(), baseOptions());
};

/** The refresh token the browser sent, if any. */
export const readRefreshCookie = (req: Request): string | undefined =>
  (req.cookies as Record<string, string> | undefined)?.[refreshCookieName()];
