import type { ThrottlerOptions } from "@nestjs/throttler";

/**
 * Every rate limit the app applies, per client address and per route. The one
 * list `app.module` registers, so anything that needs to name them all --
 * {@link SKIP_ALL_THROTTLES} -- cannot fall out of step.
 */
export const ALL_THROTTLES = [
  {
    name: "short",
    ttl: 1000, // 1 second window
    limit: 20, // 20 requests per second (more reasonable for dev)
  },
  {
    name: "long",
    ttl: 60000, // 1 minute window
    limit: 200, // 200 requests per minute (increased for Vite)
  },
] as const satisfies readonly ThrottlerOptions[];

/**
 * For `@SkipThrottle(SKIP_ALL_THROTTLES)`. A bare `@SkipThrottle()` skips only
 * a throttler named "default", which this app does not have, so it silently
 * skips nothing.
 */
export const SKIP_ALL_THROTTLES: Record<string, boolean> = Object.fromEntries(
  ALL_THROTTLES.map(({ name }) => [name, true]),
);
