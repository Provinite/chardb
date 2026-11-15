import { createHash, randomBytes } from "node:crypto";

/** Every personal access token's secret starts with this. */
export const ACCESS_TOKEN_PREFIX = "chardb_pat_";

/** A new secret: the prefix and 32 random bytes. */
export function generateAccessTokenSecret(): string {
  return `${ACCESS_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
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
