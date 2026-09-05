/**
 * Which browser origins may make credentialed calls to this API.
 *
 * This used to be `origin: true` -- reflect whatever the caller claims -- next
 * to `credentials: true`. That combination was survivable only because the
 * session lived in a bearer header that no browser attaches on its own: a
 * hostile page could be told "yes, you may", and still had nothing to send.
 *
 * The refresh cookie removes that safety net. A cookie on `.chardb.cc` is
 * attached by the browser to every request this API receives, so reflecting an
 * arbitrary origin would hand any site on the internet a credentialed session.
 * The allowlist is therefore not a hardening pass on top of the cookie change;
 * it is part of it.
 *
 * `ROOT_DOMAIN` drives the whole list because communities are served from
 * `*.${ROOT_DOMAIN}` and there is no enumerating them in advance -- a community
 * created a minute ago has to work without redeploying the API.
 */

const rootDomain = (): string => process.env.ROOT_DOMAIN || "localhost";

/**
 * Extra origins that are not under the root domain: CloudFront's own
 * `*.cloudfront.net` hostname before DNS is cut over, a preview deployment, a
 * staging apex. Comma-separated, exact origins including scheme.
 */
const extraOrigins = (): string[] =>
  (process.env.ADDITIONAL_CORS_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

/**
 * True when `origin` is the site's apex or one of its community subdomains.
 *
 * Matching is done on a parsed URL rather than by string suffix, because
 * `https://chardb.cc.evil.example` ends with nothing useful but
 * `https://evil.example/?x=.chardb.cc` would fool a naive `includes`. Only the
 * hostname is compared, and only against the apex or exactly one label under
 * it -- `a.b.chardb.cc` is not a community and is not allowed.
 */
export const isOriginAllowed = (origin: string): boolean => {
  if (extraOrigins().includes(origin)) return true;

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const root = rootDomain().toLowerCase();
  const host = url.hostname.toLowerCase();

  if (host === root) return true;

  const suffix = `.${root}`;
  if (!host.endsWith(suffix)) return false;

  const label = host.slice(0, -suffix.length);
  return label.length > 0 && !label.includes(".");
};
