import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { NotFoundPage } from "../pages/NotFoundPage";
import { CharacterPage } from "../pages/CharacterPage";
import { useCommunityByIdQuery, useGetCharacterQuery } from "../generated/graphql";
import { communityUrl } from "../lib/communityHost";

/**
 * Forwards a legacy `/communities/:communityId/...` URL to the community's own
 * host.
 *
 * One route covers all twenty-seven of the old paths, because the translation
 * is purely mechanical: drop the `/communities/<id>` prefix and put the rest
 * on `<slug>.chardb.cc`. The id has to be resolved to a slug first, which is
 * why this fetches rather than redirecting synchronously.
 */
export const CommunityHostRedirect: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const location = useLocation();

  const { data, loading } = useCommunityByIdQuery({
    variables: { id: communityId ?? "" },
    skip: !communityId,
    errorPolicy: "ignore",
  });

  const slug = data?.community?.slug;

  // Everything after `/communities/<id>`, or `/` for the community home.
  const rest = location.pathname.replace(/^\/communities\/[^/]+/, "") || "/";

  useEffect(() => {
    if (!slug) return;
    window.location.replace(
      communityUrl(slug, `${rest}${location.search}${location.hash}`),
    );
  }, [slug, rest, location.search, location.hash]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // A community id that resolves to nothing is a dead link, not a redirect.
  return slug ? (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size="lg" />
    </div>
  ) : (
    <NotFoundPage />
  );
};

/**
 * Decides where a character reached at the apex actually belongs.
 *
 * `/character/:id` at the apex is both a permanent home and a forwarding
 * address, because a character's community comes through a nullable
 * `speciesId`. With a species, the character belongs to that species'
 * community and is served from its host, so this forwards. With no species --
 * kicked out, or the species was deleted, which nulls the column rather than
 * cascading -- there is no host it could be served from, so the apex is its
 * canonical home and the page renders here.
 *
 * Rendering `CharacterPage` in the second case rather than 404ing is the point:
 * every `/character/:id` link ever shared keeps working, whichever of the two
 * states the character is in now, and moves with it if that changes.
 */
export const CharacterHostGuard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const { data, loading } = useGetCharacterQuery({
    variables: { id: id ?? "" },
    skip: !id,
    errorPolicy: "ignore",
  });

  const slug = data?.character?.species?.community?.slug;

  useEffect(() => {
    if (!slug || !id) return;
    window.location.replace(
      communityUrl(slug, `/character/${id}${location.search}${location.hash}`),
    );
  }, [slug, id, location.search, location.hash]);

  if (loading || slug) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <CharacterPage />;
};
