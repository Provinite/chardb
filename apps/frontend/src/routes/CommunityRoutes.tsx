import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";

import { CommunityPage } from "../pages/CommunityPage";
import { CommunityCharactersPage } from "../pages/CommunityCharactersPage";
import { CommunityMyCharactersPage } from "../pages/CommunityMyCharactersPage";
import { CharacterPage } from "../pages/CharacterPage";
import { CharacterMediaPage } from "../pages/CharacterMediaPage";
import { CreateCharacterPageEnhanced as CreateCharacterPage } from "../pages/CreateCharacterPageEnhanced";
import { EditCharacterPage } from "../pages/EditCharacterPage";
import { SpendEditKitPage } from "../pages/SpendEditKitPage";
import { RedeemVariantChangePage } from "../pages/RedeemVariantChangePage";
import { EditKitCharacterPickerPage } from "../pages/EditKitCharacterPickerPage";
import { VariantChangeCharacterPickerPage } from "../pages/VariantChangeCharacterPickerPage";
import { SpeciesPage } from "../pages/SpeciesPage";
import { EditSpeciesPage } from "../pages/EditSpeciesPage";
import { SpeciesManagementPage } from "../pages/SpeciesManagementPage";
import { TraitBuilderPage } from "../pages/TraitBuilderPage";
import { SpeciesVariantManagementPage } from "../pages/SpeciesVariantManagementPage";
import { VariantDetailPage } from "../pages/VariantDetailPage";
import { EnumValueManagementPage } from "../pages/EnumValueManagementPage";
import { EnumValueSettingsPage } from "../pages/EnumValueSettingsPage";
import { ItemTypePage } from "../pages/ItemTypePage";
import { ItemProvenancePage } from "../pages/ItemProvenancePage";
import { CommunityAdminPage } from "../pages/CommunityAdminPage";
import { CommunityInviteCodesPage } from "../pages/CommunityInviteCodesPage";
import { PermissionManagementPage } from "../pages/PermissionManagementPage";
import { CommunityMembersPage } from "../pages/CommunityMembersPage";
import { CommunityMemberProfilePage } from "../pages/CommunityMemberProfilePage";
import { CommunitySettingsPage } from "../pages/CommunitySettingsPage";
import { CommunityItemsAdminPage } from "../pages/CommunityItemsAdminPage";
import { CommunityColorPalettePage } from "../pages/CommunityColorPalettePage";
import { CommunityInventoryPage } from "../pages/CommunityInventoryPage";
import { CommunityItemLedgerPage } from "../pages/CommunityItemLedgerPage";
import { CommunityCurrenciesAdminPage } from "../pages/CommunityCurrenciesAdminPage";
import { CommunityCurrencyLedgerPage } from "../pages/CommunityCurrencyLedgerPage";
import { CommunityShopPage } from "../pages/CommunityShopPage";
import { CommunityShopMyPurchasesPage } from "../pages/CommunityShopMyPurchasesPage";
import { CommunityShopAdminPage } from "../pages/CommunityShopAdminPage";
import { CommunityShopPurchasesPage } from "../pages/CommunityShopPurchasesPage";
import { CommunityModerationPage } from "../pages/CommunityModerationPage";
import { ImageModerationPage } from "../pages/ImageModerationPage";
import { TraitReviewPage } from "../pages/TraitReviewPage";
import { TradesPage } from "../pages/TradesPage";
import { TradeComposerPage } from "../pages/TradeComposerPage";
import { TradeOfferPage } from "../pages/TradeOfferPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { EditProfilePage } from "../pages/EditProfilePage";
import { CreateMediaPage } from "../pages/CreateMediaPage";
import { UploadImagePage } from "../pages/UploadImagePage";
import { CreateTextPage } from "../pages/CreateTextPage";
import { ApexRedirect } from "./ApexRedirect";

/** Forwards the legacy singular /item/:id to the canonical item type page. */
const RedirectToItemType: React.FC = () => {
  const { itemTypeId } = useParams<{ itemTypeId: string }>();
  return <Navigate to={`/item-types/${itemTypeId}`} replace />;
};

/**
 * Everything served from a community's own host, e.g. `willowmere.chardb.cc`.
 *
 * These are the twenty-seven routes that used to live under
 * `/communities/:communityId/...` plus the fifteen that were stranded at the
 * root -- species, traits, variants, item types and characters -- and were
 * community-owned all along without saying so. The community is now the host,
 * so none of them carry a community segment and no page needs a `:communityId`
 * param: `useCommunityId()` reads it off the hostname instead.
 *
 * What is deliberately NOT here is anything that reads or lists a person's own
 * things -- their profile as others see it, their galleries, their media
 * library, the feed, liked lists -- and anything belonging to the site. Those
 * stay at the apex; see `ApexRoutes`. `/my-characters` is the one apparent
 * exception and is not really one: it is this community's characters narrowed
 * to the viewer's, not a person's page served from a community host.
 *
 * The upload pages and the profile editor are here despite belonging to a
 * person, because they WRITE. Which host you were on when you uploaded is the
 * only record of which community should moderate the result, and it exists
 * nowhere else -- a `Gallery`, `Media` or `Image` reaches a community through
 * a nullable `characterId` if at all, so an upload without a character used to
 * belong nowhere and be reviewable by nobody but a site admin. Forcing those
 * pages to the apex threw the answer away before it could be recorded.
 */
export const CommunityRoutes: React.FC = () => (
  <Routes>
    {/* --- the community itself */}
    <Route path="/" element={<CommunityPage />} />
    <Route path="/characters" element={<CommunityCharactersPage />} />

    {/* The one person-shaped page that belongs on a community host rather than
        at the apex. It is not "your profile inside Cloverse" -- it is the
        community's characters narrowed to yours, which is the question #338
        was filed about, and the answer has to live where the question gets
        asked. */}
    <Route
      path="/my-characters"
      element={
        <ProtectedRoute>
          <CommunityMyCharactersPage />
        </ProtectedRoute>
      }
    />

    {/* --- characters. A character reaches its community through its species,
        so one with no species has no host and lives at the apex instead;
        `CharacterHostGuard` on the apex side owns that redirect. */}
    <Route path="/character/:id" element={<CharacterPage />} />
    <Route path="/character/:id/media" element={<CharacterMediaPage />} />
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
      path="/character/:characterId/edit-traits"
      element={
        <ProtectedRoute>
          <SpendEditKitPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/character/:characterId/change-variant"
      element={
        <ProtectedRoute>
          <RedeemVariantChangePage />
        </ProtectedRoute>
      }
    />

    {/* --- species, traits and variants */}
    <Route path="/species/:speciesId" element={<SpeciesPage />} />
    <Route
      path="/species"
      element={
        <ProtectedRoute>
          <SpeciesManagementPage />
        </ProtectedRoute>
      }
    />
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

    {/* --- items. `/items/ledger` outranks `/items/:itemId` by React Router's
        static-beats-dynamic ordering, so a literal "ledger" is never read as
        an item id. */}
    <Route path="/item-types/:itemTypeId" element={<ItemTypePage />} />
    <Route path="/item/:itemTypeId" element={<RedirectToItemType />} />
    <Route
      path="/inventory"
      element={
        <ProtectedRoute>
          <CommunityInventoryPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/items/ledger"
      element={
        <ProtectedRoute>
          <CommunityItemLedgerPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/items/:itemId"
      element={
        <ProtectedRoute>
          <ItemProvenancePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/edit-kits/:itemId"
      element={
        <ProtectedRoute>
          <EditKitCharacterPickerPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/variant-changes/:itemId"
      element={
        <ProtectedRoute>
          <VariantChangeCharacterPickerPage />
        </ProtectedRoute>
      }
    />

    {/* --- currency and shop */}
    <Route
      path="/currencies"
      element={
        <ProtectedRoute>
          <CommunityCurrenciesAdminPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/currencies/ledger"
      element={
        <ProtectedRoute>
          <CommunityCurrencyLedgerPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/shop"
      element={
        <ProtectedRoute>
          <CommunityShopPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/shop/purchases"
      element={
        <ProtectedRoute>
          <CommunityShopMyPurchasesPage />
        </ProtectedRoute>
      }
    />

    {/* --- trades. The community inbox; the cross-community one that answers
        "everything waiting on me" stays at the apex, deliberately (#293). */}
    <Route
      path="/trades"
      element={
        <ProtectedRoute>
          <TradesPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/trades/new"
      element={
        <ProtectedRoute>
          <TradeComposerPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/trades/:tradeId"
      element={
        <ProtectedRoute>
          <TradeOfferPage />
        </ProtectedRoute>
      }
    />

    {/* --- members and staff */}
    <Route
      path="/members"
      element={
        <ProtectedRoute>
          <CommunityMembersPage />
        </ProtectedRoute>
      }
    />
    {/* One person, seen from inside one community: their role here, what
        they hold here, who they are here. The apex `/user/:username` has none
        of that context and cannot grow it -- it does not know which community
        you came from. */}
    <Route
      path="/members/:username"
      element={
        <ProtectedRoute>
          <CommunityMemberProfilePage />
        </ProtectedRoute>
      }
    />
    {/* Same page either way: inventories are public within a community, so a
        named member's holdings and your own are one view with different
        actions rather than two pages of the same facts. The segment says
        `inventory` in both shapes -- it used to say `items` here and
        `inventory` for your own, which is how the feature came to be
        unfindable (#349). */}
    <Route
      path="/members/:username/inventory"
      element={
        <ProtectedRoute>
          <CommunityInventoryPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings"
      element={
        <ProtectedRoute>
          <CommunitySettingsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/permissions"
      element={
        <ProtectedRoute>
          <PermissionManagementPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/invite-codes"
      element={
        <ProtectedRoute>
          <CommunityInviteCodesPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin"
      element={
        <ProtectedRoute>
          <CommunityAdminPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/items"
      element={
        <ProtectedRoute>
          <CommunityItemsAdminPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/colors"
      element={
        <ProtectedRoute>
          <CommunityColorPalettePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/shop"
      element={
        <ProtectedRoute>
          <CommunityShopAdminPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/shop/purchases"
      element={
        <ProtectedRoute>
          <CommunityShopPurchasesPage />
        </ProtectedRoute>
      }
    />

    {/* --- moderation */}
    <Route
      path="/moderation"
      element={
        <ProtectedRoute>
          <CommunityModerationPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/moderation/images"
      element={
        <ProtectedRoute>
          <ImageModerationPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/moderation/traits"
      element={
        <ProtectedRoute>
          <TraitReviewPage />
        </ProtectedRoute>
      }
    />

    {/* --- yours rather than the community's, but reachable from here.
        Sending someone to another host to upload a picture or set an avatar
        loses the one thing this host knows that the apex does not: which
        community they were in. That is what decides whose moderators see the
        upload, so an upload started here is filed here (`Media.communityId`).
        The pages themselves are unchanged and still edit the one profile and
        the one media library you have everywhere; they say so on the page. */}
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

    {/* --- paths that only exist at the apex.
        Someone who edits the URL, or follows a stale link, lands on the right
        page rather than a 404 on the wrong host. Signing in is the important
        one: the session cookie is set for the whole parent domain, so it has
        to be established there. */}
    <Route path="/login" element={<ApexRedirect />} />
    <Route path="/signup" element={<ApexRedirect />} />
    <Route path="/forgot-password" element={<ApexRedirect />} />
    <Route path="/reset-password/*" element={<ApexRedirect />} />
    <Route path="/verify-email/*" element={<ApexRedirect />} />
    <Route path="/auth/*" element={<ApexRedirect />} />
    <Route path="/dashboard" element={<ApexRedirect />} />
    <Route path="/feed" element={<ApexRedirect />} />
    <Route path="/notifications" element={<ApexRedirect />} />
    <Route path="/user/*" element={<ApexRedirect />} />
    <Route path="/my/*" element={<ApexRedirect />} />
    <Route path="/liked/*" element={<ApexRedirect />} />
    <Route path="/galleries" element={<ApexRedirect />} />
    <Route path="/gallery/*" element={<ApexRedirect />} />
    <Route path="/media/*" element={<ApexRedirect />} />
    <Route path="/join-community" element={<ApexRedirect />} />

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
