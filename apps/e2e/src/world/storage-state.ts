import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ARTIFACTS, CFG } from "../config.js";
import type { Persona } from "./types.js";

export const statePath = (preset: string, persona: string): string =>
  path.join(ARTIFACTS, "state", preset, `${persona}.json`);

/**
 * Writes one Playwright storageState file per persona, so specs start already
 * authenticated instead of driving the login form.
 *
 * Two deliberate details:
 *
 * 1. `origin` must match the page's origin EXACTLY -- scheme, host and port.
 *    http://localhost:4311 and http://127.0.0.1:4311 are different origins, and
 *    a mismatch silently drops the localStorage entries, leaving tests
 *    mysteriously logged out with no error. CFG.host is the single source for
 *    both this and Playwright's baseURL; the assertion below pins that.
 *
 * 2. BOTH tokens are written, exactly as a real login leaves them.
 *
 *    Writing only `accessToken` looks tempting -- it avoids a refresh
 *    round-trip on every navigation -- but it breaks every protected route.
 *    AuthContext's mount effect (AuthContext.tsx:65) reads `refreshToken`, and
 *    when it is absent takes the `else` branch and calls setLoading(false)
 *    immediately, before useMeQuery has resolved. ProtectedRoute then sees
 *    loading: false with user: null and redirects to /login, even though the
 *    access token is perfectly valid. Storing both matches what the app itself
 *    produces on login, so the harness exercises the real state.
 */
export async function writeStorageStates(
  preset: string,
  personas: Record<string, Persona>,
): Promise<void> {
  const origin = new URL(CFG.frontendUrl).origin;
  if (origin !== `http://${CFG.host}:${CFG.frontendPort}`) {
    throw new Error(
      `storageState origin ${origin} does not match the configured frontend ` +
        `host/port. Auth injection would silently fail.`,
    );
  }

  for (const [key, persona] of Object.entries(personas)) {
    const file = statePath(preset, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(
      file,
      JSON.stringify(
        {
          cookies: [],
          origins: [
            {
              origin,
              localStorage: [
                { name: "accessToken", value: persona.accessToken },
                { name: "refreshToken", value: persona.refreshToken },
              ],
            },
          ],
        },
        null,
        2,
      ),
    );
  }
}
