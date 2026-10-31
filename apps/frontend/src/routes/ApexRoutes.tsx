import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";

import { SiteAdminRoute } from "../components/SiteAdminRoute";
import {
  canManageCommunities,
  canUseSiteAdmin,
  canUseSiteInviteCodes,
  isSiteAdmin,
} from "../lib/siteAdminAccess";
import {
  NotFoundPage,
  HomePage,
  LoginPage,
  SignupPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
  DashboardPage,
  UserProfilePage,
  UserCharactersPage,
  UserGalleriesPage,
  UserMediaPage,
  EditProfilePage,
  CharactersPage,
  CharacterMediaPage,
  CreateTextPage,
  CreateMediaPage,
  MediaPage,
  EditMediaPage,
  GalleryPage,
  GalleriesPage,
  CreateGalleryPage,
  UploadImagePage,
  MediaLibraryPage,
  LikedCharactersPage,
  LikedGalleriesPage,
  LikedMediaPage,
  MyCharactersPage,
  MyGalleriesPage,
  MyMediaPage,
  FollowersPage,
  FollowingPage,
  FeedPage,
  SiteAdminPage,
  SiteInviteCodesPage,
  CommunityManagementPage,
  ImageModerationPage,
  NotificationsPage,
  TradesPage,
  JoinCommunityPage,
  MyCommunitiesPage,
  DeviantArtBackfillPage,
  DiscordNameBackfillPage,
  DeviantArtCallbackPage,
  DiscordCallbackPage,
  ToyhouseCallbackPage,
  PatreonCallbackPage,
} from "./pages";
import {
  CharacterHostGuard,
  CommunityHostRedirect,
} from "./CommunityHostRedirect";

/**
 * Everything served from the site's apex host, e.g. `chardb.cc`.
 *
 * What lives here is what belongs to a person or to the site rather than to
 * any one community: profiles, galleries, media, the feed, liked lists, site
 * administration, and the OAuth callbacks -- which have to stay single-valued
 * because the URL is registered provider-side.
 *
 * Two paths exist on both hosts on purpose, following the rule #293 set. A
 * thing with two genuine scopes keeps a route in each: `/trades` here is
 * everything waiting on you across every community, while the same path on a
 * community host is that community's offers; `/characters` here is the global
 * browse, and there it is that community's roster.
 *
 * The routes are a value of their own, apart from `ApexRoutes`, so startup can
 * match the current path against them (`preloadRoute.ts`).
 */
export const apexRoutes = (
  <>
    {/* --- public */}
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
    <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
    <Route path="/characters" element={<CharactersPage />} />
    <Route path="/galleries" element={<GalleriesPage />} />
    <Route path="/gallery/:id" element={<GalleryPage />} />
    <Route path="/media" element={<MediaLibraryPage />} />
    <Route path="/media/:id" element={<MediaPage />} />

    {/* --- a character, which may or may not live here.
        See `CharacterHostGuard`: with a species it forwards to that species'
        community host, and with none it renders, because a character with no
        species has no community and the apex is the only home it has. */}
    <Route path="/character/:id" element={<CharacterHostGuard />} />
    <Route path="/character/:id/media" element={<CharacterMediaPage />} />

    {/* --- profiles.
        Public, like the profile they hang off: every query behind them is
        @AllowUnauthenticated and narrows by viewer server-side. */}
    <Route path="/user/:username" element={<UserProfilePage />} />
    <Route path="/user/:username/characters" element={<UserCharactersPage />} />
    <Route path="/user/:username/galleries" element={<UserGalleriesPage />} />
    <Route path="/user/:username/media" element={<UserMediaPage />} />
    <Route path="/user/:username/followers" element={<FollowersPage />} />
    <Route path="/user/:username/following" element={<FollowingPage />} />

    {/* --- every old community URL, forwarded to that community's host.
        One route rather than twenty-seven: the translation is mechanical once
        the id has been resolved to a slug. */}
    <Route
      path="/communities/:communityId"
      element={<CommunityHostRedirect />}
    />
    <Route
      path="/communities/:communityId/*"
      element={<CommunityHostRedirect />}
    />

    {/* --- OAuth callbacks. Single-valued provider-side, so they stay here
        whichever host the flow started from; the origin to return to rides in
        the signed `state` instead. */}
    <Route
      path="/auth/deviantart/callback"
      element={<DeviantArtCallbackPage />}
    />
    <Route path="/auth/discord/callback" element={<DiscordCallbackPage />} />
    <Route path="/auth/toyhouse/callback" element={<ToyhouseCallbackPage />} />
    <Route path="/auth/patreon/callback" element={<PatreonCallbackPage />} />

    {/* --- the signed-in person's own pages */}
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/join-community"
      element={
        <ProtectedRoute>
          <JoinCommunityPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/my/communities"
      element={
        <ProtectedRoute>
          <MyCommunitiesPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/my/characters"
      element={
        <ProtectedRoute>
          <MyCharactersPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/my/galleries"
      element={
        <ProtectedRoute>
          <MyGalleriesPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/my/media"
      element={
        <ProtectedRoute>
          <MyMediaPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/liked/characters"
      element={
        <ProtectedRoute>
          <LikedCharactersPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/liked/galleries"
      element={
        <ProtectedRoute>
          <LikedGalleriesPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/liked/media"
      element={
        <ProtectedRoute>
          <LikedMediaPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/feed"
      element={
        <ProtectedRoute>
          <FeedPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/notifications"
      element={
        <ProtectedRoute>
          <NotificationsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/profile/edit"
      element={
        <ProtectedRoute>
          <EditProfilePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/profile"
      element={
        <ProtectedRoute>
          <Navigate to="/profile/edit" replace />
        </ProtectedRoute>
      }
    />

    {/* --- galleries and media, which belong to a person rather than a
        community. `Image` has no path to a community at all, and `Gallery` and
        `Media` reach one only through a nullable `characterId`, so there is no
        community host that could serve them. */}
    <Route
      path="/gallery/create"
      element={
        <ProtectedRoute>
          <CreateGalleryPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/upload"
      element={
        <ProtectedRoute>
          <CreateMediaPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/image/upload"
      element={
        <ProtectedRoute>
          <UploadImagePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/text/create"
      element={
        <ProtectedRoute>
          <CreateTextPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/media/:id/edit"
      element={
        <ProtectedRoute>
          <EditMediaPage />
        </ProtectedRoute>
      }
    />

    {/* --- the cross-community trade inbox. Deliberately global: the question
        it answers is "what is waiting on me", which no single community can. */}
    <Route
      path="/trades"
      element={
        <ProtectedRoute>
          <TradesPage />
        </ProtectedRoute>
      }
    />

    {/* --- site administration */}
    <Route
      path="/admin"
      element={
        <SiteAdminRoute allow={canUseSiteAdmin}>
          <SiteAdminPage />
        </SiteAdminRoute>
      }
    />
    <Route
      path="/admin/site-invite-codes"
      element={
        <SiteAdminRoute allow={canUseSiteInviteCodes}>
          <SiteInviteCodesPage />
        </SiteAdminRoute>
      }
    />
    <Route
      path="/admin/deviantart-backfill"
      element={
        <SiteAdminRoute allow={isSiteAdmin}>
          <DeviantArtBackfillPage />
        </SiteAdminRoute>
      }
    />
    <Route
      path="/admin/discord-names"
      element={
        <SiteAdminRoute allow={isSiteAdmin}>
          <DiscordNameBackfillPage />
        </SiteAdminRoute>
      }
    />
    <Route
      path="/admin/communities"
      element={
        <SiteAdminRoute allow={canManageCommunities}>
          <CommunityManagementPage />
        </SiteAdminRoute>
      }
    />
    <Route
      path="/admin/moderation/images"
      element={
        <SiteAdminRoute allow={isSiteAdmin}>
          <ImageModerationPage siteWide />
        </SiteAdminRoute>
      }
    />

    <Route path="*" element={<NotFoundPage />} />
  </>
);

export const ApexRoutes: React.FC = () => <Routes>{apexRoutes}</Routes>;
