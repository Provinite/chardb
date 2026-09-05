import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ARTIFACTS, CFG } from "../config.js";
import { REFRESH_COOKIE_NAME } from "./refresh-cookie.js";
import type { Persona } from "./types.js";

export const statePath = (preset: string, persona: string): string =>
  path.join(ARTIFACTS, "state", preset, `${persona}.json`);

/**
 * Writes one Playwright storageState file per persona, so specs start already
 * authenticated instead of driving the login form.
 *
 * What gets written is ONE COOKIE and no localStorage at all. Nothing about a
 * session is in storage any more: the refresh token is an `HttpOnly` cookie
 * and the access token lives in a module variable for the life of the tab,
 * re-minted from that cookie on every page load (#339). Seeding the cookie is
 * therefore the whole of "this browser is signed in", and it reproduces
 * exactly the state a real login leaves behind rather than a state no
 * application path produces.
 *
 * Two deliberate details:
 *
 * 1. **The domain is the API's, and it carries a leading dot.** A cookie is
 *    attached to a request by the host the REQUEST goes to, not by the host of
 *    the page making it -- so what matters is that it reaches
 *    `api.${rootDomain}`, where the GraphQL endpoint lives. A leading dot
 *    makes it a domain cookie rather than a host-only one, so it covers the
 *    apex, the API and every community subdomain from one entry, which is what
 *    lets a spec cross hosts mid-test.
 *
 *    Playwright accepts the dotted form and Chromium stores it as written
 *    (verified: a `.e2e.localhost` cookie is sent from `e2e.localhost` and
 *    from `willowmere.e2e.localhost` alike; the same cookie written as
 *    `e2e.localhost`, host-only, is sent from neither, because the request
 *    goes to `api.e2e.localhost`).
 *
 * 2. **The root domain has a spare label for a reason.** `SameSite=Lax` means
 *    the browser only attaches the cookie when the API is first-party to the
 *    page, and `localhost` is a public suffix -- so under a plain `localhost`
 *    root, `willowmere.localhost` and the API would be different sites and no
 *    cookie would ever be sent from a community host. See CFG.rootDomain; the
 *    assertion below pins the two together.
 */
export async function writeStorageStates(
  preset: string,
  personas: Record<string, Persona>,
): Promise<void> {
  if (!CFG.browserBackendUrl.includes(`.${CFG.rootDomain}:`)) {
    throw new Error(
      `The API host ${CFG.browserBackendUrl} is not under ${CFG.rootDomain}, ` +
        `so a refresh cookie for that domain would never be sent to it and ` +
        `every seeded persona would silently be signed out.`,
    );
  }

  for (const [key, persona] of Object.entries(personas)) {
    const file = statePath(preset, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(
      file,
      JSON.stringify(
        {
          cookies: [
            {
              name: REFRESH_COOKIE_NAME,
              value: persona.refreshCookie,
              domain: `.${CFG.rootDomain}`,
              path: "/",
              // A session cookie, like the one a browser holds between page
              // loads. The JWT inside carries the real expiry.
              expires: -1,
              httpOnly: true,
              // No TLS in the harness, and the backend only marks the cookie
              // Secure when NODE_ENV is production.
              secure: false,
              sameSite: "Lax",
            },
          ],
          origins: [],
        },
        null,
        2,
      ),
    );
  }
}
