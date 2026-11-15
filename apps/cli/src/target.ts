/**
 * Every access token names the environment it was minted in:
 * `chardb_pat_<environment>_<random>`. The backend's own copy of this rule is
 * `apps/backend/src/auth/personal-access-tokens/access-token-secret.ts`.
 */
export const ENVIRONMENTS = ["prod", "dev", "local"] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

const TOKEN_PREFIX = "chardb_pat_";

export function isEnvironment(value: string): value is Environment {
  return (ENVIRONMENTS as readonly string[]).includes(value);
}

/** The environment a token names, or null for anything that names none. */
export function tokenEnvironment(token: string): Environment | null {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const rest = token.slice(TOKEN_PREFIX.length);
  const separator = rest.indexOf("_");
  if (separator <= 0 || separator === rest.length - 1) return null;
  const environment = rest.slice(0, separator);
  return isEnvironment(environment) ? environment : null;
}

const DEPLOYED: Record<Exclude<Environment, "local">, string> = {
  prod: "https://api.chardb.cc/graphql",
  dev: "https://api.dev.chardb.cc/graphql",
};

/** Slot 0's backend, for a local token run outside any checkout. */
const LOCAL_FALLBACK = "http://localhost:4000/graphql";

/**
 * Where a token's requests go.
 *
 * An explicit URL (the flag, then `CHARDB_API_URL`) wins. Otherwise prod and
 * dev go to their deployed APIs, and local to this checkout's backend:
 * `GRAPHQL_ENDPOINT` is set by `scripts/with-instance.mjs` for the checkout's
 * slot.
 */
export function graphqlUrl(
  environment: Environment,
  env: { CHARDB_API_URL?: string; GRAPHQL_ENDPOINT?: string },
  flag?: string,
): string {
  const explicit = flag ?? env.CHARDB_API_URL;
  if (explicit) return withGraphqlPath(explicit);
  if (environment === "local") return env.GRAPHQL_ENDPOINT ?? LOCAL_FALLBACK;
  return DEPLOYED[environment];
}

function withGraphqlPath(url: string): string {
  const trimmed = url.replace(/\/+$/, "");
  return trimmed.endsWith("/graphql") ? trimmed : `${trimmed}/graphql`;
}
