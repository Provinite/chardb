/**
 * The session cookie, from the harness's side.
 *
 * The refresh token is no longer returned in the `login` payload -- it leaves
 * as an `HttpOnly` cookie on the parent domain, and only the short-lived access
 * token comes back in the response body (#339). A seeded persona therefore has
 * to read its session off the `Set-Cookie` header, exactly as a browser would.
 *
 * Mirrors apps/backend/src/auth/refresh-cookie.ts. Duplicated rather than
 * imported: the e2e package deliberately depends on the backend's HTTP surface
 * and generated schema, not on its source.
 */
export const REFRESH_COOKIE_NAME = "chardb_rt";

/**
 * The refresh cookie's VALUE from a login/signup response.
 *
 * Only the value is kept. The attributes are the server's business, and the
 * harness re-declares its own when it writes a Playwright storageState -- see
 * world/storage-state.ts for why the domain it writes is not the one the
 * server sent.
 */
export function readRefreshCookie(response: Response): string {
  const headers: string[] = response.headers.getSetCookie();
  for (const header of headers) {
    // `name=value; Path=/; HttpOnly; ...` -- the pair is always first.
    const [pair] = header.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0 && pair.slice(0, eq).trim() === REFRESH_COOKIE_NAME) {
      return pair.slice(eq + 1).trim();
    }
  }
  throw new Error(
    `The response set no ${REFRESH_COOKIE_NAME} cookie. Set-Cookie was: ` +
      (headers.length ? headers.join(" | ") : "(absent)"),
  );
}
