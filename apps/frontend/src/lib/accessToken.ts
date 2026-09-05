/**
 * The access token, held in memory for the life of the tab.
 *
 * It used to live in `localStorage` alongside the refresh token. The refresh
 * token has moved to an `HttpOnly` cookie so that no script can read it
 * (#339), which leaves no reason to persist the access token either: it can be
 * re-minted from the cookie on every page load, and keeping it out of storage
 * means an XSS has a few minutes of stolen session rather than seven days of
 * renewable one.
 *
 * A module-level variable rather than React state because Apollo's links need
 * it synchronously, outside any component.
 */
let accessToken: string | null = null;

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};
