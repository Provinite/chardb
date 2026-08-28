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
 *    A fidelity choice: the harness should reproduce the state the app itself
 *    creates, and login writes both. Writing only the access token would test a
 *    state no application path produces. That single-token case is still
 *    exercised deliberately, in tests/smoke/session-restore.e2e.ts.
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
