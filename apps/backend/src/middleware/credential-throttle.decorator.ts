import { Throttle } from "@nestjs/throttler";

/**
 * The stricter limit for mutations that take a credential, a token or an email
 * address from an unauthenticated caller: 10 a minute per client address, in
 * place of the global 200 (`app.module.ts`). The per-second limit still applies
 * on top.
 *
 * Buckets are per resolver, so a client gets 10 logins and, separately, 10
 * password resets each minute.
 */
export const CredentialThrottle = () =>
  Throttle({ long: { limit: 10, ttl: 60_000 } });
