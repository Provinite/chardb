/**
 * Recovers a tab left open across a deploy.
 *
 * Pages load their code on demand, from files named after a hash of their
 * contents. A deploy replaces those files and deletes the old ones, so a tab
 * still running the previous build asks for chunk names that no longer exist,
 * and gets `index.html` back instead (the CDN answers every miss with it).
 * Vite reports the failed import as `vite:preloadError`; reloading fetches the
 * current build, which lands on the same URL because the address bar moved
 * before the page's code was requested.
 *
 * Only once per `RELOAD_GUARD_MS`: if the freshly loaded build fails too, the
 * chunk is missing for some other reason and reloading again would loop. Where
 * session storage is blocked there is no way to know, so it does not reload.
 */

const RELOADED_AT = "chardb:chunk-reload-at";

export const RELOAD_GUARD_MS = 10_000;

const readReloadedAt = (): number | null => {
  const value = sessionStorage.getItem(RELOADED_AT);
  return value === null ? null : Number(value);
};

/** Starts listening; returns a function that stops. */
export const reloadOnStaleChunk = (
  reload: () => void = () => window.location.reload(),
): (() => void) => {
  const onPreloadError = (event: Event) => {
    try {
      const reloadedAt = readReloadedAt();
      if (reloadedAt !== null && Date.now() - reloadedAt < RELOAD_GUARD_MS) {
        return;
      }
      sessionStorage.setItem(RELOADED_AT, String(Date.now()));
    } catch {
      return;
    }
    event.preventDefault();
    reload();
  };

  window.addEventListener("vite:preloadError", onPreloadError);
  return () => window.removeEventListener("vite:preloadError", onPreloadError);
};
