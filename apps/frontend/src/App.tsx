import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ScrollToTop } from "./components/ScrollToTop";

// Pages
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { EditProfilePage } from "./pages/EditProfilePage";
import { CharacterPage } from "./pages/CharacterPage";
import { CharacterMediaPage } from "./pages/CharacterMediaPage";
import { CharactersPage } from "./pages/CharactersPage";
import { CreateCharacterPageEnhanced as CreateCharacterPage } from "./pages/CreateCharacterPageEnhanced";
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
import { VariantDetailPage } from "./pages/VariantDetailPage";
import { EnumValueManagementPage } from "./pages/EnumValueManagementPage";
import { EnumValueSettingsPage } from "./pages/EnumValueSettingsPage";
import { PermissionManagementPage } from "./pages/PermissionManagementPage";
import { CommunityMembersPage } from "./pages/CommunityMembersPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { TradesPage } from "./pages/TradesPage";
import { TradeOfferPage } from "./pages/TradeOfferPage";
import { TradeComposerPage } from "./pages/TradeComposerPage";
import { CommunitySettingsPage } from "./pages/CommunitySettingsPage";
import { ImageModerationPage } from "./pages/ImageModerationPage";
import { TraitReviewPage } from "./pages/TraitReviewPage";
import { JoinCommunityPage } from "./pages/JoinCommunityPage";
import { MyCommunitiesPage } from "./pages/MyCommunitiesPage";
import { CommunityPage } from "./pages/CommunityPage";
import { CommunityCharactersPage } from "./pages/CommunityCharactersPage";
import { SpeciesPage } from "./pages/SpeciesPage";
import { EditSpeciesPage } from "./pages/EditSpeciesPage";
import { DeviantArtBackfillPage } from "./pages/DeviantArtBackfillPage";
import { DeviantArtCallbackPage } from "./pages/DeviantArtCallbackPage";
import { DiscordCallbackPage } from "./pages/DiscordCallbackPage";
import { ToyhouseCallbackPage } from "./pages/ToyhouseCallbackPage";
import { CommunityItemsAdminPage } from "./pages/CommunityItemsAdminPage";
import { CommunityCurrenciesAdminPage } from "./pages/CommunityCurrenciesAdminPage";
import { CommunityCurrencyLedgerPage } from "./pages/CommunityCurrencyLedgerPage";
import { CommunityShopPage } from "./pages/CommunityShopPage";
import { CommunityShopAdminPage } from "./pages/CommunityShopAdminPage";
import { CommunityShopPurchasesPage } from "./pages/CommunityShopPurchasesPage";
import { CommunityInventoryPage } from "./pages/CommunityInventoryPage";
import { CommunityItemLedgerPage } from "./pages/CommunityItemLedgerPage";
import { ItemProvenancePage } from "./pages/ItemProvenancePage";
import { CommunityColorPalettePage } from "./pages/CommunityColorPalettePage";
import { ItemTypePage } from "./pages/ItemTypePage";
import { NotFoundPage } from "./pages/NotFoundPage";

/** Forwards the legacy singular /item/:id to the canonical item type page. */
const RedirectToItemType: React.FC = () => {
  const { itemTypeId } = useParams<{ itemTypeId: string }>();
  return <Navigate to={`/item-types/${itemTypeId}`} replace />;
};

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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/character/:id" element={<CharacterPage />} />
        {/* Public like the character page itself: this is the same media, all
            of it rather than the first pageful. */}
        <Route path="/character/:id/media" element={<CharacterMediaPage />} />
        <Route path="/galleries" element={<GalleriesPage />} />
        <Route path="/gallery/:id" element={<GalleryPage />} />
        <Route path="/media" element={<MediaLibraryPage />} />
        <Route path="/media/:id" element={<MediaPage />} />
        <Route path="/user/:username" element={<UserProfilePage />} />
        <Route path="/user/:username/followers" element={<FollowersPage />} />
        <Route path="/user/:username/following" element={<FollowingPage />} />
        <Route path="/communities/:communityId" element={<CommunityPage />} />
        <Route
          path="/communities/:communityId/characters"
          element={<CommunityCharactersPage />}
        />
        <Route path="/species/:speciesId" element={<SpeciesPage />} />
        {/* An "item" is now a single instance with its own history, so /items/
            belongs to instances and the catalogue entry moved to /item-types/.
            The singular /item/ alias (a0a2e5a) redirects rather than rendering
            a second copy of the same page: one canonical URL, one forwarding
            rule for whatever was linking to it. */}
        <Route path="/item-types/:itemTypeId" element={<ItemTypePage />} />
        <Route path="/item/:itemTypeId" element={<RedirectToItemType />} />

        {/* OAuth callback routes */}
        <Route
          path="/auth/deviantart/callback"
          element={<DeviantArtCallbackPage />}
        />
        <Route
          path="/auth/discord/callback"
          element={<DiscordCallbackPage />}
        />
        <Route
          path="/auth/toyhouse/callback"
          element={<ToyhouseCallbackPage />}
        />

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
        <Route
          path="/communities/:communityId/permissions"
          element={
            <ProtectedRoute>
              <PermissionManagementPage />
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
          path="/trades"
          element={
            <ProtectedRoute>
              <TradesPage />
            </ProtectedRoute>
          }
        />
        {/* Not nested under a community: a member's trades are one inbox
            regardless of which community each offer belongs to, and the trade
            itself names its community. */}
        <Route
          path="/trades/:tradeId"
          element={
            <ProtectedRoute>
              <TradeOfferPage />
            </ProtectedRoute>
          }
        />
        {/* The composer IS community-scoped, unlike the inbox: an offer moves
            items and coin that only exist inside one community. */}
        <Route
          path="/communities/:communityId/trades/new"
          element={
            <ProtectedRoute>
              <TradeComposerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities/:communityId/members"
          element={
            <ProtectedRoute>
              <CommunityMembersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities/:communityId/settings"
          element={
            <ProtectedRoute>
              <CommunitySettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities/:communityId/admin/items"
          element={
            <ProtectedRoute>
              <CommunityItemsAdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities/:communityId/admin/colors"
          element={
            <ProtectedRoute>
              <CommunityColorPalettePage />
            </ProtectedRoute>
          }
        />
        {/* Same page either way: inventories are public within a community,
            so a named member's holdings and your own are one view with
            different actions rather than two pages of the same facts. */}
        <Route
          path="/communities/:communityId/members/:username/items"
          element={
            <ProtectedRoute>
              <CommunityInventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities/:communityId/inventory"
          element={
            <ProtectedRoute>
              <CommunityInventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities/:communityId/items/ledger"
          element={
            <ProtectedRoute>
              <CommunityItemLedgerPage />
            </ProtectedRoute>
          }
        />
        {/* Currency management sits under the community rather than under
            /admin, because the supply table is readable by any member and
            only the actions on it are gated. */}
        <Route
          path="/communities/:communityId/currencies"
          element={
            <ProtectedRoute>
              <CommunityCurrenciesAdminPage />
            </ProtectedRoute>
          }
        />
        {/* Declared before the ledger's own path would be ambiguous with a
            currency id, so this stays a literal segment. */}
        <Route
          path="/communities/:communityId/currencies/ledger"
          element={
            <ProtectedRoute>
              <CommunityCurrencyLedgerPage />
            </ProtectedRoute>
          }
        />
        {/* The shop members see, and the one staff configure. Separate pages
            rather than one with a mode: the buying page is a storefront and
            the admin page is a table, and neither wants to be the other. */}
        <Route
          path="/communities/:communityId/shop"
          element={
            <ProtectedRoute>
              <CommunityShopPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities/:communityId/admin/shop"
          element={
            <ProtectedRoute>
              <CommunityShopAdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities/:communityId/admin/shop/purchases"
          element={
            <ProtectedRoute>
              <CommunityShopPurchasesPage />
            </ProtectedRoute>
          }
        />
        {/* Community-scoped so the page sits inside that community's
            navigation. An item belongs to exactly one community, and the page
            redirects if the URL names a different one. */}
        <Route
          path="/communities/:communityId/items/:itemId"
          element={
            <ProtectedRoute>
              <ItemProvenancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities/:communityId/moderation/images"
          element={
            <ProtectedRoute>
              <ImageModerationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities/:communityId/moderation/traits"
          element={
            <ProtectedRoute>
              <TraitReviewPage />
            </ProtectedRoute>
          }
        />

        {/* Species-specific routes (can be accessed from community context) */}
        <Route
          path="/species/:speciesId/edit"
          element={
            <ProtectedRoute>
              <EditSpeciesPage />
            </ProtectedRoute>
          }
        />
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
        <Route
          path="/traits/:traitId/enum-values"
          element={
            <ProtectedRoute>
              <EnumValueManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/variants/:variantId/manage"
          element={
            <ProtectedRoute>
              <VariantDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/variants/:variantId/enum-settings"
          element={
            <ProtectedRoute>
              <EnumValueSettingsPage />
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
