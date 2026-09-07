import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { CookieOptions, Request, Response } from "express";
import type { JwtService } from "@nestjs/jwt";
import {
  resolveRequestOrigin,
  resolveReturnOrigin,
} from "./oauth-return-origin";

/**
 * The `state` token an account-linking flow carries, and the browser cookie
 * that proves the flow came back to the browser that started it.
 *
 * Linking is a three-legged trip: the signed-in user asks us for a provider
 * URL, the provider bounces their browser to `/auth/<provider>/callback`, and
 * that callback attaches the provider identity to a user id. The callback is
 * necessarily `@AllowUnauthenticated()` -- it arrives as a top-level navigation
 * from Discord/DeviantArt/Toyhouse, with no `Authorization` header to speak of
 * -- so the user id has to ride along in the `state` token instead.
 *
 * Which is the hole this module closes (#379). A `state` signed with only
 * `sub` and `ret` is a bearer token for "link a provider account to this user",
 * good for its whole ten-minute life from *any* browser. Anyone who reads one
 * out of a URL bar, a Referer header, a provider's logs or a shared screen can
 * finish the flow themselves and end up with their own provider identity
 * fastened to somebody else's account -- and because
 * `ExternalAccountsService.linkExternalAccount` also claims pending characters
 * and items addressed to that identity, the consequences reach past the link
 * row itself.
 *
 * So the state alone is no longer sufficient. Issuing one now also sets a
 * random nonce as an `HttpOnly` cookie on the API host and puts *the hash of
 * that nonce* in the token; the callback has to present both halves. The hash
 * rather than the nonce because the token is handed to the provider and shows
 * up in URLs, logs and referrers, whereas the cookie is not readable by script
 * and travels nowhere else -- keeping the secret half exclusively in the
 * cookie is the entire point.
 *
 * This is `oauth-return-origin.ts`'s trick applied to the identity rather than
 * the destination: something the browser must also hold, checked on the way
 * back.
 *
 * Note the deploy edge: tokens minted before this shipped carry no `bnd` and
 * their browsers hold no cookie, so flows in flight across the deploy fail and
 * have to be restarted. Tolerating a missing `bnd` for a grace period would
 * leave the hole open for exactly as long as it has been open, which is not a
 * trade worth making for a ten-minute window.
 */

/** The three providers an account can be linked to; also the route segment. */
export type OAuthLinkProvider = "discord" | "deviantart" | "toyhouse";

/** The `state` token payload, signed on initiate and read back on callback. */
interface OAuthLinkStatePayload {
  /** The initiating user's id. */
  sub: string;
  /** Origin to return the user to; see `oauth-return-origin.ts`. */
  ret?: string;
  /** SHA-256 of the nonce held by the initiating browser's cookie. */
  bnd: string;
}

/**
 * What the callback learned from the state it was handed.
 *
 * A union rather than a thrown error because `returnBase` is meaningful on
 * both arms: once the token parses we know which community subdomain the user
 * came from, and a *failed* link should land them back there rather than on
 * the apex. An exception would have to smuggle that value out through the
 * catch block, which is worse than reading it off the result.
 */
export type ConsumedLinkState =
  | { ok: true; userId: string; returnBase: string }
  | { ok: false; returnBase: string; error: string };

/**
 * Shown when the state is valid but the browser presenting it is not the one
 * that started the flow -- no cookie, or a cookie that does not match.
 *
 * Deliberately covers both causes, because from here they are indistinguishable
 * from the innocent ones: a cookie cleared by hand, a browser that discarded it,
 * or a link finished on a different device all look exactly like an attempt to
 * replay somebody else's state.
 */
export const LINK_STATE_BROWSER_MISMATCH =
  "This linking request was started in a different browser or has expired.";

/**
 * Ten minutes, in both the units the two halves want.
 *
 * They have to match: a cookie outliving its token would leave a browser
 * holding a key to a lock that no longer exists, and a token outliving its
 * cookie is precisely the unbound state this module exists to prevent.
 */
const LINK_STATE_TTL = "10m";
const LINK_STATE_TTL_MS = 10 * 60 * 1000;

/**
 * The state token is signed with a secret derived from `JWT_SECRET` rather
 * than `JWT_SECRET` itself, so a state token can never be presented as a
 * session token or the reverse. Preserved from the three controllers this
 * replaced, where the same `+ "_O"` was written out three times.
 */
const stateSecret = (jwtSecret: string): string => `${jwtSecret}_O`;

/**
 * One cookie per provider, so two flows started in different tabs cannot
 * clobber each other -- with a single shared name, opening a Toyhouse link
 * while a Discord one is pending would silently break the Discord callback.
 */
const nonceCookieName = (provider: OAuthLinkProvider): string =>
  `chardb_oauth_link_${provider}`;

/**
 * Deliberately narrower than the session cookie's.
 *
 * Host-only (no `Domain`), so only the API host ever receives it -- unlike the
 * refresh cookie, which has to reach every community subdomain and therefore
 * cannot be. Scoped to the provider's own route, which covers both ends of the
 * flow (`/auth/discord` and `/auth/discord/callback`) and nothing else, so the
 * nonce is not attached to every other API request for ten minutes.
 *
 * `SameSite=Lax` is load-bearing rather than conventional: the callback is a
 * cross-site top-level navigation from the provider, which `Lax` permits and
 * `Strict` would not -- under `Strict` the cookie would simply never come back
 * and no link would ever complete.
 *
 * `clearCookie` matches on name, domain and path, so both call sites read
 * these from here rather than spelling them out, the same reason
 * `refresh-cookie.ts` keeps its own in one place.
 */
const cookieOptions = (provider: OAuthLinkProvider): CookieOptions => ({
  httpOnly: true,
  // Not over plain http in development, where there is no TLS to attach to.
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: `/auth/${provider}`,
});

const hashNonce = (nonce: string): string =>
  createHash("sha256").update(nonce).digest("hex");

/** The nonce this browser was issued for `provider`, if it still holds one. */
const readNonceCookie = (
  req: Request,
  provider: OAuthLinkProvider,
): string | undefined => {
  const value = (req.cookies as Record<string, string> | undefined)?.[
    nonceCookieName(provider)
  ];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

/**
 * Compared over the hex digests as bytes, with a length guard because
 * `timingSafeEqual` throws on mismatched lengths rather than returning false.
 *
 * Constant time is not strictly load-bearing here -- an attacker learning a
 * digest byte by byte still cannot invert SHA-256 to find the cookie value --
 * but it costs one line and spares the next reader the same analysis.
 */
const bindingMatches = (expected: unknown, nonce: string): boolean => {
  if (typeof expected !== "string") return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(hashNonce(nonce), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
};

export interface IssueLinkStateOptions {
  jwtService: JwtService;
  /** Raw `JWT_SECRET`; the state-specific derivation happens in here. */
  jwtSecret: string;
  provider: OAuthLinkProvider;
  /** The signed-in user the provider account will be attached to. */
  userId: string;
  req: Request;
  res: Response;
  /** Where to send someone whose origin we are not willing to honour. */
  frontendUrl: string;
}

/**
 * Mint a `state` token for a linking flow and bind it to this browser.
 *
 * Sets the nonce cookie on `res` as a side effect, which is why the initiate
 * route needs the response object at all. It is a `passthrough` response --
 * the route still returns its JSON body as before.
 */
export const issueLinkState = ({
  jwtService,
  jwtSecret,
  provider,
  userId,
  req,
  res,
  frontendUrl,
}: IssueLinkStateOptions): string => {
  const nonce = randomBytes(32).toString("base64url");

  res.cookie(nonceCookieName(provider), nonce, {
    ...cookieOptions(provider),
    maxAge: LINK_STATE_TTL_MS,
  });

  const payload: OAuthLinkStatePayload = {
    sub: userId,
    ret: resolveRequestOrigin(req, frontendUrl),
    bnd: hashNonce(nonce),
  };

  return jwtService.sign(payload, {
    secret: stateSecret(jwtSecret),
    expiresIn: LINK_STATE_TTL,
  });
};

export interface ConsumeLinkStateOptions {
  jwtService: JwtService;
  /** Raw `JWT_SECRET`; the state-specific derivation happens in here. */
  jwtSecret: string;
  provider: OAuthLinkProvider;
  req: Request;
  res: Response;
  /** Where a failure with no trustworthy origin of its own lands. */
  frontendUrl: string;
}

/**
 * Read `state` off the callback request and decide whether to trust it.
 *
 * The cookie is cleared before anything else, unconditionally, which makes a
 * nonce single-use: quoting a state at the callback spends it whether or not
 * it turns out to match. That does hand anyone who can make the victim's
 * browser hit the callback a way to break one pending link, which costs the
 * user a second click -- cheaper than leaving a nonce replayable for the rest
 * of its ten minutes.
 */
export const consumeLinkState = ({
  jwtService,
  jwtSecret,
  provider,
  req,
  res,
  frontendUrl,
}: ConsumeLinkStateOptions): ConsumedLinkState => {
  const nonce = readNonceCookie(req, provider);
  res.clearCookie(nonceCookieName(provider), cookieOptions(provider));

  const state = req.query.state;
  if (typeof state !== "string" || state.length === 0) {
    return {
      ok: false,
      returnBase: frontendUrl,
      error: "Missing state parameter",
    };
  }

  let payload: OAuthLinkStatePayload;
  try {
    payload = jwtService.verify<OAuthLinkStatePayload>(state, {
      secret: stateSecret(jwtSecret),
    });
  } catch {
    return {
      ok: false,
      returnBase: frontendUrl,
      error: "Invalid or expired state token",
    };
  }

  // Known from here on, so even a rejected link returns the user to the
  // community they started from rather than dumping them at the apex.
  const returnBase = resolveReturnOrigin(payload.ret, frontendUrl);

  if (!nonce || !bindingMatches(payload.bnd, nonce)) {
    return { ok: false, returnBase, error: LINK_STATE_BROWSER_MISMATCH };
  }

  return { ok: true, userId: payload.sub, returnBase };
};
