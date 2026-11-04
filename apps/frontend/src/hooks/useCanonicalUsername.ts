import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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

    const segments = location.pathname.split("/");
    const index = segments.findIndex((segment) => {
      try {
        return decodeURIComponent(segment) === fromUrl;
      } catch {
        // A stray `%` elsewhere in the path is not the username.
        return false;
      }
    });
    if (index === -1) return;
    segments[index] = encodeURIComponent(stored);

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
