import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";

import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { SignupPage } from "../pages/SignupPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { DashboardPage } from "../pages/DashboardPage";
import { UserProfilePage } from "../pages/UserProfilePage";
import { UserCharactersPage } from "../pages/UserCharactersPage";
import { UserGalleriesPage } from "../pages/UserGalleriesPage";
import { UserMediaPage } from "../pages/UserMediaPage";
import { EditProfilePage } from "../pages/EditProfilePage";
import { CharactersPage } from "../pages/CharactersPage";
import { CharacterMediaPage } from "../pages/CharacterMediaPage";
import { CreateTextPage } from "../pages/CreateTextPage";
import { CreateMediaPage } from "../pages/CreateMediaPage";
import { MediaPage } from "../pages/MediaPage";
import { EditMediaPage } from "../pages/EditMediaPage";
import { GalleryPage } from "../pages/GalleryPage";
import { GalleriesPage } from "../pages/GalleriesPage";
import { CreateGalleryPage } from "../pages/CreateGalleryPage";
import { UploadImagePage } from "../pages/UploadImagePage";
import { MediaLibraryPage } from "../pages/MediaLibraryPage";
import { LikedCharactersPage } from "../pages/LikedCharactersPage";
import { LikedGalleriesPage } from "../pages/LikedGalleriesPage";
import { LikedMediaPage } from "../pages/LikedMediaPage";
import { MyCharactersPage } from "../pages/MyCharactersPage";
import { MyGalleriesPage } from "../pages/MyGalleriesPage";
import { MyMediaPage } from "../pages/MyMediaPage";
import { FollowersPage } from "../pages/FollowersPage";
import { FollowingPage } from "../pages/FollowingPage";
import { FeedPage } from "../pages/FeedPage";
import { SiteAdminPage } from "../pages/SiteAdminPage";
import { SiteInviteCodesPage } from "../pages/SiteInviteCodesPage";
import { CommunityManagementPage } from "../pages/CommunityManagementPage";
import { NotificationsPage } from "../pages/NotificationsPage";
import { TradesPage } from "../pages/TradesPage";
import { JoinCommunityPage } from "../pages/JoinCommunityPage";
import { MyCommunitiesPage } from "../pages/MyCommunitiesPage";
import { DeviantArtBackfillPage } from "../pages/DeviantArtBackfillPage";
import { DeviantArtCallbackPage } from "../pages/DeviantArtCallbackPage";
import { DiscordCallbackPage } from "../pages/DiscordCallbackPage";
import { ToyhouseCallbackPage } from "../pages/ToyhouseCallbackPage";
import { NotFoundPage } from "../pages/NotFoundPage";
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
 */
export const ApexRoutes: React.FC = () => (
  <Routes>
    {/* --- public */}
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
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
    <Route
      path="/user/:username/characters"
      element={<UserCharactersPage />}
    />
    <Route path="/user/:username/galleries" element={<UserGalleriesPage />} />
    <Route path="/user/:username/media" element={<UserMediaPage />} />
    <Route path="/user/:username/followers" element={<FollowersPage />} />
    <Route path="/user/:username/following" element={<FollowingPage />} />

    {/* --- every old community URL, forwarded to that community's host.
        One route rather than twenty-seven: the translation is mechanical once
        the id has been resolved to a slug. */}
    <Route path="/communities/:communityId" element={<CommunityHostRedirect />} />
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
        <ProtectedRoute>
          <SiteAdminPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/site-invite-codes"
      element={
        <ProtectedRoute>
          <SiteInviteCodesPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/deviantart-backfill"
      element={
        <ProtectedRoute>
          <DeviantArtBackfillPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/communities"
      element={
        <ProtectedRoute>
          <CommunityManagementPage />
        </ProtectedRoute>
      }
    />

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
