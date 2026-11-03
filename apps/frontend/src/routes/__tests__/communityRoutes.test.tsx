import { isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
} from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { communityRoutes } from "../CommunityRoutes";
import { ApexRedirect } from "../ApexRedirect";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
  CreateGalleryPage,
  DeviantArtCallbackPage,
  DiscordCallbackPage,
  EditMediaPage,
  GalleriesPage,
  GalleryPage,
  MediaLibraryPage,
  MediaPage,
  MyGalleriesPage,
  MyMediaPage,
  NotificationsPage,
  PatreonCallbackPage,
  ToyhouseCallbackPage,
  UserCharactersPage,
  UserGalleriesPage,
  UserMediaPage,
  FollowersPage,
  FollowingPage,
  LikedCharactersPage,
  LikedGalleriesPage,
  LikedMediaPage,
  FeedPage,
  MyCommunitiesPage,
} from "../pages";
import { ForwardKeepingQuery, UserToMemberProfile } from "../CommunityRoutes";

const SearchEcho = () => <>{useLocation().search}</>;

/** The innermost element a community host renders for `path`. */
const elementAt = (path: string): ReactNode => {
  const matches = matchRoutes(createRoutesFromChildren(communityRoutes), path);
  return matches?.[matches.length - 1]?.route.element;
};

/** The page `path` renders, looking through a `ProtectedRoute` wrapper. */
const pageAt = (path: string): unknown => {
  const element = elementAt(path);
  if (!isValidElement<{ children?: ReactNode }>(element)) return null;
  if (element.type !== ProtectedRoute) return element.type;
  const child = element.props.children;
  return isValidElement(child) ? child.type : null;
};

describe("community host routes", () => {
  // The API sends a linking flow back to the host that started it. Bouncing
  // that callback to the apex strands the viewer outside their community.
  it.each([
    ["/auth/deviantart/callback", DeviantArtCallbackPage],
    ["/auth/discord/callback", DiscordCallbackPage],
    ["/auth/toyhouse/callback", ToyhouseCallbackPage],
    ["/auth/patreon/callback", PatreonCallbackPage],
  ])("serves %s locally", (path, page) => {
    expect(pageAt(`${path}?success=true`)).toBe(page);
  });

  // A community host is the site prefiltered to the community, so these are
  // served here rather than sent to the apex.
  it.each([
    ["/notifications", NotificationsPage],
    ["/media", MediaLibraryPage],
    ["/media/m1", MediaPage],
    ["/media/m1/edit", EditMediaPage],
    ["/galleries", GalleriesPage],
    ["/gallery/g1", GalleryPage],
    ["/gallery/create", CreateGalleryPage],
    ["/my/media", MyMediaPage],
    ["/my/galleries", MyGalleriesPage],
    ["/user/bob/characters", UserCharactersPage],
    ["/user/bob/galleries", UserGalleriesPage],
    ["/user/bob/media", UserMediaPage],
    ["/user/bob/followers", FollowersPage],
    ["/user/bob/following", FollowingPage],
    ["/liked/characters", LikedCharactersPage],
    ["/liked/galleries", LikedGalleriesPage],
    ["/liked/media", LikedMediaPage],
    ["/feed", FeedPage],
    ["/my/communities", MyCommunitiesPage],
  ])("serves %s locally", (path, page) => {
    expect(pageAt(path)).toBe(page);
  });

  // The member profile is the profile here: global identity plus what they
  // have in this community.
  it("forwards /user/:username to the member profile", () => {
    expect(pageAt("/user/bob")).toBe(UserToMemberProfile);
  });

  // Both have a community equivalent at another path. The query survives:
  // folder links carry `?folder=`.
  it.each([
    ["/my/characters", "/my-characters"],
    ["/dashboard", "/"],
  ])("forwards %s to %s", (path, to) => {
    const element = elementAt(path);

    expect(isValidElement(element) && element.type).toBe(ForwardKeepingQuery);
    expect(isValidElement<{ to: string }>(element) && element.props.to).toBe(
      to,
    );
  });

  it("keeps the query when forwarding", async () => {
    render(
      <MemoryRouter initialEntries={["/my/characters?folder=f1"]}>
        <Routes>
          <Route
            path="/my/characters"
            element={<ForwardKeepingQuery to="/my-characters" />}
          />
          <Route path="/my-characters" element={<SearchEcho />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("?folder=f1")).toBeInTheDocument();
  });

  it("still sends other /auth paths to the apex", () => {
    expect(pageAt("/auth/something-else")).toBe(ApexRedirect);
  });
});
