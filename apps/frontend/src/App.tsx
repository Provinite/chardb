import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ScrollToTop } from "./components/ScrollToTop";

// Pages
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { EditProfilePage } from "./pages/EditProfilePage";
import { CharacterPage } from "./pages/CharacterPage";
import { CharactersPage } from "./pages/CharactersPage";
import { CreateCharacterPage } from "./pages/CreateCharacterPage";
import { EditCharacterPage } from "./pages/EditCharacterPage";
import { CreateTextPage } from "./pages/CreateTextPage";
import { CreateMediaPage } from "./pages/CreateMediaPage";
import { MediaPage } from "./pages/MediaPage";
import { EditMediaPage } from "./pages/EditMediaPage";
import { GalleryPage } from "./pages/GalleryPage";
import { GalleriesPage } from "./pages/GalleriesPage";
import { CreateGalleryPage } from "./pages/CreateGalleryPage";
import { UploadImagePage } from "./pages/UploadImagePage";
import { MediaLibraryPage } from "./pages/MediaLibraryPage";
import { LikedCharactersPage } from "./pages/LikedCharactersPage";
import { LikedGalleriesPage } from "./pages/LikedGalleriesPage";
import { LikedMediaPage } from "./pages/LikedMediaPage";
import { MyCharactersPage } from "./pages/MyCharactersPage";
import { MyGalleriesPage } from "./pages/MyGalleriesPage";
import { MyMediaPage } from "./pages/MyMediaPage";
import { FollowersPage } from "./pages/FollowersPage";
import { FollowingPage } from "./pages/FollowingPage";
import { FeedPage } from "./pages/FeedPage";
import { SiteAdminPage } from "./pages/SiteAdminPage";
import { SiteInviteCodesPage } from "./pages/SiteInviteCodesPage";
import { CommunityInviteCodesPage } from "./pages/CommunityInviteCodesPage";
import { CommunityManagementPage } from "./pages/CommunityManagementPage";
import { CommunityAdminPage } from "./pages/CommunityAdminPage";
import { SpeciesManagementPage } from "./pages/SpeciesManagementPage";
import { TraitBuilderPage } from "./pages/TraitBuilderPage";
import { SpeciesVariantManagementPage } from "./pages/SpeciesVariantManagementPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Layout>
      <ScrollToTop />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/character/:id" element={<CharacterPage />} />
        <Route path="/galleries" element={<GalleriesPage />} />
        <Route path="/gallery/:id" element={<GalleryPage />} />
        <Route path="/media" element={<MediaLibraryPage />} />
        <Route path="/media/:id" element={<MediaPage />} />
        <Route path="/user/:username" element={<UserProfilePage />} />
        <Route path="/user/:username/followers" element={<FollowersPage />} />
        <Route path="/user/:username/following" element={<FollowingPage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/character/create"
          element={
            <ProtectedRoute>
              <CreateCharacterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/character/:id/edit"
          element={
            <ProtectedRoute>
              <EditCharacterPage />
            </ProtectedRoute>
          }
        />
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
              <Navigate to="/dashboard" replace />
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
          path="/feed"
          element={
            <ProtectedRoute>
              <FeedPage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
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
          path="/admin/communities"
          element={
            <ProtectedRoute>
              <CommunityManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Community routes */}
        <Route
          path="/communities/:communityId/admin"
          element={
            <ProtectedRoute>
              <CommunityAdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities/:communityId/invite-codes"
          element={
            <ProtectedRoute>
              <CommunityInviteCodesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities/:communityId/species"
          element={
            <ProtectedRoute>
              <SpeciesManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Species-specific routes (can be accessed from community context) */}
        <Route
          path="/species/:speciesId/traits"
          element={
            <ProtectedRoute>
              <TraitBuilderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/species/:speciesId/variants"
          element={
            <ProtectedRoute>
              <SpeciesVariantManagementPage />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
