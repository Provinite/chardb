/**
 * The environments a personal access token can belong to. Its secret names
 * one, so a leaked token says at a glance whether it opens production.
 */
export const ACCESS_TOKEN_ENVIRONMENTS = ["prod", "dev", "local"] as const;

export type AccessTokenEnvironment = (typeof ACCESS_TOKEN_ENVIRONMENTS)[number];

export function isAccessTokenEnvironment(
  value: string,
): value is AccessTokenEnvironment {
  return (ACCESS_TOKEN_ENVIRONMENTS as readonly string[]).includes(value);
}

/** `APP_ENVIRONMENT` names something that is not an environment. */
export class UnknownAppEnvironmentError extends Error {
  constructor(readonly value: string) {
    super("APP_ENVIRONMENT is not prod, dev or local");
    this.name = "UnknownAppEnvironmentError";
  }
}

/**
 * The environment this server mints and accepts tokens for, from
 * `APP_ENVIRONMENT`.
 *
 * Unset, a development or test server is `local`. A production build is
 * none, and makes and accepts no token: the deployed dev stack runs as
 * `NODE_ENV=production` too, so guessing would label its tokens prod.
 *
 * @throws UnknownAppEnvironmentError for a value that names no environment,
 * so a typo stops the server rather than turning tokens off.
 */
export function accessTokenEnvironment(env: {
  APP_ENVIRONMENT?: string;
  NODE_ENV?: string;
}): AccessTokenEnvironment | null {
  const named = env.APP_ENVIRONMENT?.trim();
  if (named) {
    if (!isAccessTokenEnvironment(named)) {
      throw new UnknownAppEnvironmentError(named);
    }
    return named;
  }
  return env.NODE_ENV === "production" ? null : "local";
}
