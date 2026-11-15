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
 * The bearer credential on a request, or on a subscription's connection
 * parameters. Null when there is none.
 */
export function bearerCredential(req: unknown): string | null {
  const request = req as
    | {
        headers?: { authorization?: unknown };
        connectionParams?: { authorization?: unknown };
      }
    | undefined;
  const header =
    request?.headers?.authorization ?? request?.connectionParams?.authorization;
  if (typeof header !== "string") return null;
  // The scheme is case-insensitive (RFC 6750).
  const match = /^bearer (.+)$/i.exec(header);
  return match ? match[1] : null;
}
