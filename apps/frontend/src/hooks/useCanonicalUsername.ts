import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** `["", "user", ":username", ...]` once the path is split on `/`. */
const USERNAME_SEGMENT = 2;

/**
 * Puts the username in the URL back into the casing it was signed up with.
 *
 * Usernames are looked up ignoring case, so `/user/FOO` loads foo's profile.
 * Once the page has the stored name, this swaps it into the path segment the
 * visitor typed, keeping the rest of the path, the query and the hash, and
 * replaces the history entry so Back skips the miscased URL.
 */
export function useCanonicalUsername(
  fromUrl: string | undefined,
  stored: string | undefined,
): void {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!fromUrl || !stored || fromUrl === stored) return;
    if (fromUrl.toLowerCase() !== stored.toLowerCase()) return;

    // Every username route is `/<section>/:username/...` (`/user/...` on the
    // apex, `/members/...` in a community), so the name is always the second
    // segment. Searching by value instead would hit `/user/user` at the route
    // word.
    const segments = location.pathname.split("/");
    let segment: string;
    try {
      segment = decodeURIComponent(segments[USERNAME_SEGMENT] ?? "");
    } catch {
      return;
    }
    if (segment !== fromUrl) return;
    segments[USERNAME_SEGMENT] = encodeURIComponent(stored);

    navigate(
      {
        pathname: segments.join("/"),
        search: location.search,
        hash: location.hash,
      },
      { replace: true },
    );
  }, [fromUrl, stored, location, navigate]);
}
