import { lazyPage } from "./lazyPage";

/**
 * Every page the route tables render, each loaded on demand.
 *
 * One definition per page, shared by both tables, so a page reachable from
 * the apex and from a community host is still one chunk. Most pages are their
 * own chunk; pages always visited together load as one, from a barrel in
 * `chunks/`, because splitting them would only add requests.
 *
 * Nothing in the shell imports a page directly, error pages included: every
 * page calls `usePageMeta`, which brings the markdown parser with it.
 */

const siteAdmin = () => import("./chunks/siteAdmin");
const communityAdmin = () => import("./chunks/communityAdmin");
const speciesAdmin = () => import("./chunks/speciesAdmin");

// --- errors
export const NotFoundPage = lazyPage(
  () => import("../pages/NotFoundPage"),
  "NotFoundPage",
);
export const CommunityUnreachable = lazyPage(
  () => import("../pages/CommunityUnreachable"),
  "CommunityUnreachable",
);

// --- signing in
export const LoginPage = lazyPage(
  () => import("../pages/LoginPage"),
  "LoginPage",
);
export const SignupPage = lazyPage(
  () => import("../pages/SignupPage"),
  "SignupPage",
);
export const ForgotPasswordPage = lazyPage(
  () => import("../pages/ForgotPasswordPage"),
  "ForgotPasswordPage",
);
export const ResetPasswordPage = lazyPage(
  () => import("../pages/ResetPasswordPage"),
  "ResetPasswordPage",
);
export const VerifyEmailPage = lazyPage(
  () => import("../pages/VerifyEmailPage"),
  "VerifyEmailPage",
);
export const DeviantArtCallbackPage = lazyPage(
  () => import("../pages/DeviantArtCallbackPage"),
  "DeviantArtCallbackPage",
);
export const DiscordCallbackPage = lazyPage(
  () => import("../pages/DiscordCallbackPage"),
  "DiscordCallbackPage",
);
export const ToyhouseCallbackPage = lazyPage(
  () => import("../pages/ToyhouseCallbackPage"),
  "ToyhouseCallbackPage",
);
export const PatreonCallbackPage = lazyPage(
  () => import("../pages/PatreonCallbackPage"),
  "PatreonCallbackPage",
);

// --- the apex
export const HomePage = lazyPage(() => import("../pages/HomePage"), "HomePage");
export const DashboardPage = lazyPage(
  () => import("../pages/DashboardPage"),
  "DashboardPage",
);
export const CharactersPage = lazyPage(
  () => import("../pages/CharactersPage"),
  "CharactersPage",
);
export const FeedPage = lazyPage(() => import("../pages/FeedPage"), "FeedPage");
export const NotificationsPage = lazyPage(
  () => import("../pages/NotificationsPage"),
  "NotificationsPage",
);
export const JoinCommunityPage = lazyPage(
  () => import("../pages/JoinCommunityPage"),
  "JoinCommunityPage",
);
export const MyCommunitiesPage = lazyPage(
  () => import("../pages/MyCommunitiesPage"),
  "MyCommunitiesPage",
);
export const EditProfilePage = lazyPage(
  () => import("../pages/EditProfilePage"),
  "EditProfilePage",
);

// --- profiles
export const UserProfilePage = lazyPage(
  () => import("../pages/UserProfilePage"),
  "UserProfilePage",
);
export const UserCharactersPage = lazyPage(
  () => import("../pages/UserCharactersPage"),
  "UserCharactersPage",
);
export const UserGalleriesPage = lazyPage(
  () => import("../pages/UserGalleriesPage"),
  "UserGalleriesPage",
);
export const UserMediaPage = lazyPage(
  () => import("../pages/UserMediaPage"),
  "UserMediaPage",
);
export const FollowersPage = lazyPage(
  () => import("../pages/FollowersPage"),
  "FollowersPage",
);
export const FollowingPage = lazyPage(
  () => import("../pages/FollowingPage"),
  "FollowingPage",
);

// --- your own and liked lists
export const MyCharactersPage = lazyPage(
  () => import("../pages/MyCharactersPage"),
  "MyCharactersPage",
);
export const MyGalleriesPage = lazyPage(
  () => import("../pages/MyGalleriesPage"),
  "MyGalleriesPage",
);
export const MyMediaPage = lazyPage(
  () => import("../pages/MyMediaPage"),
  "MyMediaPage",
);
export const LikedCharactersPage = lazyPage(
  () => import("../pages/LikedCharactersPage"),
  "LikedCharactersPage",
);
export const LikedGalleriesPage = lazyPage(
  () => import("../pages/LikedGalleriesPage"),
  "LikedGalleriesPage",
);
export const LikedMediaPage = lazyPage(
  () => import("../pages/LikedMediaPage"),
  "LikedMediaPage",
);

// --- galleries and media
export const GalleriesPage = lazyPage(
  () => import("../pages/GalleriesPage"),
  "GalleriesPage",
);
export const GalleryPage = lazyPage(
  () => import("../pages/GalleryPage"),
  "GalleryPage",
);
export const CreateGalleryPage = lazyPage(
  () => import("../pages/CreateGalleryPage"),
  "CreateGalleryPage",
);
export const MediaLibraryPage = lazyPage(
  () => import("../pages/MediaLibraryPage"),
  "MediaLibraryPage",
);
export const MediaPage = lazyPage(
  () => import("../pages/MediaPage"),
  "MediaPage",
);
export const EditMediaPage = lazyPage(
  () => import("../pages/EditMediaPage"),
  "EditMediaPage",
);
export const CreateMediaPage = lazyPage(
  () => import("../pages/CreateMediaPage"),
  "CreateMediaPage",
);
export const UploadImagePage = lazyPage(
  () => import("../pages/UploadImagePage"),
  "UploadImagePage",
);
export const CreateTextPage = lazyPage(
  () => import("../pages/CreateTextPage"),
  "CreateTextPage",
);

// --- a community
export const CommunityPage = lazyPage(
  () => import("../pages/CommunityPage"),
  "CommunityPage",
);
export const CommunityCharactersPage = lazyPage(
  () => import("../pages/CommunityCharactersPage"),
  "CommunityCharactersPage",
);
export const CommunityMyCharactersPage = lazyPage(
  () => import("../pages/CommunityMyCharactersPage"),
  "CommunityMyCharactersPage",
);
export const CommunityCandyBoardsPage = lazyPage(
  () => import("../pages/CommunityCandyBoardsPage"),
  "CommunityCandyBoardsPage",
);
export const CommunityCandyBoardPage = lazyPage(
  () => import("../pages/CommunityCandyBoardPage"),
  "CommunityCandyBoardPage",
);
export const CommunityMembersPage = lazyPage(
  () => import("../pages/CommunityMembersPage"),
  "CommunityMembersPage",
);
export const CommunityMemberProfilePage = lazyPage(
  () => import("../pages/CommunityMemberProfilePage"),
  "CommunityMemberProfilePage",
);
export const CommunityExternalMembersPage = lazyPage(
  () => import("../pages/CommunityExternalMembersPage"),
  "CommunityExternalMembersPage",
);
export const CommunityPendingHoldingsPage = lazyPage(
  () => import("../pages/CommunityPendingHoldingsPage"),
  "CommunityPendingHoldingsPage",
);
export const CommunityModerationPage = lazyPage(
  () => import("../pages/CommunityModerationPage"),
  "CommunityModerationPage",
);
export const TraitReviewPage = lazyPage(
  () => import("../pages/TraitReviewPage"),
  "TraitReviewPage",
);
export const ImageModerationPage = lazyPage(
  () => import("../pages/ImageModerationPage"),
  "ImageModerationPage",
);

// --- characters
export const CharacterPage = lazyPage(
  () => import("../pages/CharacterPage"),
  "CharacterPage",
);
export const CharacterMediaPage = lazyPage(
  () => import("../pages/CharacterMediaPage"),
  "CharacterMediaPage",
);
export const CreateCharacterPage = lazyPage(
  () => import("../pages/CreateCharacterPageEnhanced"),
  "CreateCharacterPageEnhanced",
);
export const EditCharacterPage = lazyPage(
  () => import("../pages/EditCharacterPage"),
  "EditCharacterPage",
);
export const SpendEditKitPage = lazyPage(
  () => import("../pages/SpendEditKitPage"),
  "SpendEditKitPage",
);
export const RedeemVariantChangePage = lazyPage(
  () => import("../pages/RedeemVariantChangePage"),
  "RedeemVariantChangePage",
);
export const EditKitCharacterPickerPage = lazyPage(
  () => import("../pages/EditKitCharacterPickerPage"),
  "EditKitCharacterPickerPage",
);
export const VariantChangeCharacterPickerPage = lazyPage(
  () => import("../pages/VariantChangeCharacterPickerPage"),
  "VariantChangeCharacterPickerPage",
);

// --- species
export const SpeciesPage = lazyPage(
  () => import("../pages/SpeciesPage"),
  "SpeciesPage",
);
export const SpeciesManagementPage = lazyPage(
  speciesAdmin,
  "SpeciesManagementPage",
);
export const EditSpeciesPage = lazyPage(speciesAdmin, "EditSpeciesPage");
export const TraitBuilderPage = lazyPage(speciesAdmin, "TraitBuilderPage");
export const SpeciesVariantManagementPage = lazyPage(
  speciesAdmin,
  "SpeciesVariantManagementPage",
);
export const VariantDetailPage = lazyPage(speciesAdmin, "VariantDetailPage");
export const EnumValueManagementPage = lazyPage(
  speciesAdmin,
  "EnumValueManagementPage",
);
export const EnumValueSettingsPage = lazyPage(
  speciesAdmin,
  "EnumValueSettingsPage",
);

// --- items, currency and the shop
export const ItemTypePage = lazyPage(
  () => import("../pages/ItemTypePage"),
  "ItemTypePage",
);
export const ItemProvenancePage = lazyPage(
  () => import("../pages/ItemProvenancePage"),
  "ItemProvenancePage",
);
export const CommunityInventoryPage = lazyPage(
  () => import("../pages/CommunityInventoryPage"),
  "CommunityInventoryPage",
);
export const CommunityItemLedgerPage = lazyPage(
  () => import("../pages/CommunityItemLedgerPage"),
  "CommunityItemLedgerPage",
);
export const CommunityCurrencyLedgerPage = lazyPage(
  () => import("../pages/CommunityCurrencyLedgerPage"),
  "CommunityCurrencyLedgerPage",
);
export const CommunityShopPage = lazyPage(
  () => import("../pages/CommunityShopPage"),
  "CommunityShopPage",
);
export const CommunityShopMyPurchasesPage = lazyPage(
  () => import("../pages/CommunityShopMyPurchasesPage"),
  "CommunityShopMyPurchasesPage",
);

// --- trades
export const TradesPage = lazyPage(
  () => import("../pages/TradesPage"),
  "TradesPage",
);
export const TradeComposerPage = lazyPage(
  () => import("../pages/TradeComposerPage"),
  "TradeComposerPage",
);
export const TradeOfferPage = lazyPage(
  () => import("../pages/TradeOfferPage"),
  "TradeOfferPage",
);

// --- community administration
export const CommunityAdminPage = lazyPage(
  communityAdmin,
  "CommunityAdminPage",
);
export const CommunityItemsAdminPage = lazyPage(
  communityAdmin,
  "CommunityItemsAdminPage",
);
export const CommunityColorPalettePage = lazyPage(
  communityAdmin,
  "CommunityColorPalettePage",
);
export const CommunityShopAdminPage = lazyPage(
  communityAdmin,
  "CommunityShopAdminPage",
);
export const CommunityShopPurchasesPage = lazyPage(
  communityAdmin,
  "CommunityShopPurchasesPage",
);
export const CommunityHalloweenAdminPage = lazyPage(
  communityAdmin,
  "CommunityHalloweenAdminPage",
);
export const CommunityCurrenciesAdminPage = lazyPage(
  communityAdmin,
  "CommunityCurrenciesAdminPage",
);
export const CommunitySettingsPage = lazyPage(
  communityAdmin,
  "CommunitySettingsPage",
);
export const PermissionManagementPage = lazyPage(
  communityAdmin,
  "PermissionManagementPage",
);
export const CommunityInviteCodesPage = lazyPage(
  communityAdmin,
  "CommunityInviteCodesPage",
);

// --- site administration
export const SiteAdminPage = lazyPage(siteAdmin, "SiteAdminPage");
export const SiteInviteCodesPage = lazyPage(siteAdmin, "SiteInviteCodesPage");
export const CommunityManagementPage = lazyPage(
  siteAdmin,
  "CommunityManagementPage",
);
export const DeviantArtBackfillPage = lazyPage(
  siteAdmin,
  "DeviantArtBackfillPage",
);
export const DiscordNameBackfillPage = lazyPage(
  siteAdmin,
  "DiscordNameBackfillPage",
);
