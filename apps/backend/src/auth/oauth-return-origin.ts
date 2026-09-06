import { Request } from "express";
import { isOriginAllowed } from "./allowed-origins";

/**
 * Where an OAuth account-linking flow should drop the user when it finishes.
 *
 * Communities are served from their own subdomains, so the person who started
 * linking a Discord account from `willowmere.chardb.cc` must come back to
 * `willowmere.chardb.cc` and not to the apex -- the session cookie is shared
 * across the root domain, but the app's routing and their sense of place are
 * not.
 *
 * The provider's registered callback URL cannot carry this: it is single-valued
 * and registered with Discord/DeviantArt/Toyhouse out of band. So the origin
 * rides along in the signed `state` token instead, and these helpers are the
 * two ends of that trip.
 *
 * The failure mode being designed against throughout is an open redirect: a
 * `ret` we echo without checking would let an attacker hand a victim a link
 * that bounces off our own domain onto theirs, carrying whatever the callback
 * puts in the query string. Hence the allowlist on both ends.
 */

/**
 * The origin the linking request was started from, or `fallback` if it is not
 * one we are willing to send anyone back to.
 *
 * Checked here, before signing, so that a token is never minted carrying a
 * destination the callback would only refuse ten minutes later.
 */
export const resolveRequestOrigin = (
  req: Request,
  fallback: string,
): string => {
  const candidate = originHeader(req) ?? refererOrigin(req);
  return candidate && isOriginAllowed(candidate) ? candidate : fallback;
};

/**
 * The origin to redirect to at the end of the flow.
 *
 * `ret` arrives inside a JWT we signed ourselves, so it cannot have been
 * tampered with in the browser -- and it is re-validated anyway. Re-checking
 * costs a URL parse and buys two things: an allowlist change takes effect
 * immediately rather than after every outstanding token has expired, and the
 * redirect stays safe even if the state token's integrity is ever weakened.
 */
export const resolveReturnOrigin = (
  ret: string | undefined,
  fallback: string,
): string => (ret && isOriginAllowed(ret) ? ret : fallback);

const originHeader = (req: Request): string | undefined => {
  const origin = req.headers.origin;
  return typeof origin === "string" && origin !== "null" ? origin : undefined;
};

/**
 * Same-origin navigations and some browsers omit `Origin` on a plain `GET`, so
 * the referring page's origin is the next best evidence of where the user is.
 */
const refererOrigin = (req: Request): string | undefined => {
  const referer = req.headers.referer;
  if (typeof referer !== "string") return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
};
