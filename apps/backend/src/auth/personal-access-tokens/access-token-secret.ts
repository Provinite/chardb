import { createHash, randomBytes } from "node:crypto";
import {
  type AccessTokenEnvironment,
  isAccessTokenEnvironment,
} from "./access-token-environment";

/**
 * Every personal access token's secret starts with this, then names its
 * environment: `chardb_pat_prod_…`. One pattern finds every token; the
 * environment says which matter.
 */
export const ACCESS_TOKEN_PREFIX = "chardb_pat_";

/** A new secret: the prefix, the environment, and 32 random bytes. */
export function generateAccessTokenSecret(
  environment: AccessTokenEnvironment,
): string {
  const random = randomBytes(32).toString("base64url");
  return `${ACCESS_TOKEN_PREFIX}${environment}_${random}`;
}

/** The environment a secret names, or null for one that names none. */
export function accessTokenSecretEnvironment(
  secret: string,
): AccessTokenEnvironment | null {
  if (!isAccessTokenSecret(secret)) return null;
  const rest = secret.slice(ACCESS_TOKEN_PREFIX.length);
  const separator = rest.indexOf("_");
  if (separator <= 0 || separator === rest.length - 1) return null;
  const environment = rest.slice(0, separator);
  return isAccessTokenEnvironment(environment) ? environment : null;
}

/** What is stored in place of the secret: SHA-256, hex. */
export function hashAccessTokenSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function isAccessTokenSecret(value: string): boolean {
  return value.startsWith(ACCESS_TOKEN_PREFIX);
}

/**
 * `Bearer <credential>`: the scheme in any case (RFC 9110 §11.1), one or more
 * spaces, then one credential of the characters RFC 6750 allows a bearer
 * token. Blanks around the whole are dropped first, since nothing trims a
 * subscription's connection parameters the way Node trims a header.
 */
const BEARER = /^bearer +([A-Za-z0-9\-._~+/]+=*)$/i;

/**
 * The bearer credential on a request, or on a subscription's connection
 * parameters. Null when there is none, or it is malformed.
 *
 * A request with an Authorization header is answered by that header alone,
 * whatever its scheme.
 */
export function bearerCredential(req: unknown): string | null {
  const request = req as
    | {
        // Node lowercases header names.
        headers?: { authorization?: unknown };
        // The client's own object: its key may be in any case.
        connectionParams?: Record<string, unknown>;
      }
    | undefined;
  const value =
    request?.headers?.authorization ??
    authorizationParam(request?.connectionParams);
  if (typeof value !== "string") return null;
  return BEARER.exec(value.trim())?.[1] ?? null;
}

function authorizationParam(
  params: Record<string, unknown> | undefined,
): unknown {
  if (!params || typeof params !== "object") return undefined;
  const key = Object.keys(params).find(
    (name) => name.toLowerCase() === "authorization",
  );
  return key === undefined ? undefined : params[key];
}
