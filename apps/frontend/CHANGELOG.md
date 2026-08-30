# Frontend Changelog

All notable changes to the frontend application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Shop pages: a storefront with a cart, confirmation, and undo for members, and
  a listings and price editor for staff. The buyer's balance shows in the
  header so prices mean something without opening the wallet.

- **Shop Purchases** (`/communities/:communityId/admin/shop/purchases`): every
  member's purchases, with a refund not bound by the buyer's fifteen minutes.
  Members were being told to ask a moderator who had no button to press.

- **Notifications**: a bell in the top bar with an unseen count and a dropdown
  of the most recent few, plus a full feed at `/notifications` with an unread
  filter. Opening the dropdown clears the badge; a notification stays unread
  until it is opened.

- **Award recipients widget** on each image moderation card. Lists everyone
  the upload names, deduplicated — posting your own art of your own character
  is one row reading `uploader · owner`, while gift art of someone else's
  character is two or three — with an amount each and one currency for the
  card. Approving sends them.

  It renders only when the server returns recipients, which it does not for
  viewers without `canGrantItems`. A moderator who only moderates sees the
  queue exactly as before.

  Someone who cannot be paid gets no input and says why, rather than an input
  that would be silently ignored. The toast reports what the ledger recorded
  rather than what was submitted, so a recipient who has left the community is
  not claimed as paid.

- **Ledger rows link to what paid for them.** A row created by an approval
  carries "from an approved upload →" through to the media.

- Member list rows show the member's real avatar, falling back to initials.

### Fixed

- **Logging out did not clear the Apollo cache**, so the next person to sign in
  on the same browser could see the previous user's cached data — their
  notifications, their `me`, their liked characters — until each query's network
  reply landed. Found during the security review of the notification work.

- **The notification badge showed the previous session's count after signing
  in.** The header outlives a login, so the bell never remounted and nothing
  clears the Apollo cache in between — the number stayed stale until the
  five-minute poll came round, or showed the count belonging to whoever was
  signed in before.

- Sold-out and at-the-cap shop prices now look disabled, not just unaffordable
  ones.

- A refund credits the member who asked for it, so the community ledger read it
  as "@member → @member". Self-directed grants no longer show the arrow.

- **A fractional award amount no longer fails the whole approval.** A number
  input yields `"2.5"` happily, which the server rejects as a non-integer with
  a generic validation error and the image left pending. Amounts are truncated
  before sending.
- **The award panel is no longer offered to site admins who are not members of
  the community.** Community permissions are role-based, so the approval would
  refuse them — the panel rendered a button that could only throw.
- The activity feed and the permission matrix show real avatars; both rendered
  initials for everyone before.
- A user profile's recent media now asks for `visibility` and `textContent`,
  which `MediaGrid` needs and the query never selected.

### Changed

- Every user avatar now renders through the shared `Avatar` from `@chardb/ui`,
  replacing thirteen per-file copies that had drifted apart.
- The community page reads its member count from `Community.memberCount`
  instead of fetching a one-row page of the permission-gated member list, which
  had silently shown non-members `0`.

## [v11.3.0] - 2026-08-30

## [v11.2.0] - 2026-08-30

### Added

- **Currencies page** (`/communities/:communityId/currencies`): the supply
  table is the page — circulation, holders, 30-day granted and removed, and the
  largest single balance, per currency. Someone about to grant 5,000 more of
  something should see how much already exists without navigating. Granting and
  removing both happen here; spending does not, because that is a member acting
  on their own balance rather than staff acting on the economy.

  Listed under **Community** in the sidebar, not Administration. The numbers are
  readable by any member; only the actions are gated.

- **Currency wallet** on the holdings page, above items rather than on a page of
  its own — coin and items are one answer to "what does this person have", and
  splitting them makes a trade partner check twice. Currencies held at zero are
  shown deliberately: a wallet listing only what you already have cannot tell
  you a currency exists, which is the one thing you need to know before you can
  earn any. Send appears only on your own wallet, and only on a currency you
  actually hold.

- **Currency ledger** (`/communities/:communityId/currencies/ledger`): every
  movement, newest first, filterable by kind, currency and text. A transfer's
  two rows collapse to one line here; a bulk grant's do not, because each
  recipient genuinely received their own coin and collapsing would hide who was
  paid.

- `src/lib/currencyDisplay.ts` with 27 unit tests. Amounts render symbol-first
  when a currency has one and code-after when it does not, because "⬡250" and
  "250 HC" both read naturally while "HC 250" does not.

### Added

- **Member list** (`/communities/:communityId/members`): replaces a placeholder that said member management was "under development". Lists everyone with their role, searchable, with a link to each member's holdings — which is the point, since holdings were previously reachable only by typing a URL.

- **Circulation numbers on the admin items page**: the item type grid becomes a table carrying circulation, holders, grants and revokes over 30 days, and unclaimed count, with community totals above it. A type with items owed to nobody gets an amber stripe rather than only a number.

### Changed

- **The inventory page is now one page for three audiences** (`/communities/:communityId/inventory`, or `/communities/:communityId/members/:username/items` for someone else). A member looking at themselves, someone sizing up a trade partner, and staff about to correct something all see the same facts; permissions add actions rather than changing what is shown.

  Items are grouped by type with an expandable list of the individual items underneath, each linking to its own history.

  **There are no staff actions on this page.** Revoking happens on an item's own page, where its history is in front of you — taking something away should require first looking at what it is and where it came from. An earlier draft put per-item checkboxes and a bulk revoke here; asking which of twenty-four interchangeable tokens to revoke was the wrong question, and the selection UI it needed was the worst part of the page.

- **Names in the item ledger link to that member's holdings.**

## [v11.1.0] - 2026-08-30

### Added

- **Item provenance page** (`/communities/:communityId/items/:itemId`): one item's history, oldest first, phrased per event kind rather than as a raw from/to pair. A destroyed item still resolves and says so. Staff notes render inline for viewers who hold item permissions; the server nulls them for everyone else, so the page gates nothing itself.

  This is what the public-provenance decision was for. The API shipped in v11.0.0 with no interface, so until now the ledger showed a community's firehose and nothing showed a single object's story.

  Alongside the timeline: a **chain of custody** panel listing everyone who has held the item and for how long, derived from the history rather than stored separately so the two cannot disagree; and an **item facts** panel giving its origin, when it was first seen, whether it is tradeable or consumable, and its community.

- **Revoke from the item page**: holders of `canGrantItems` get a Revoke action taking a required public reason and an optional staff note. `revokeItems` shipped in v11.0.0 with no way to reach it.

### Changed

- **Item URLs**: the catalogue entry moved from `/items/:id` to `/item-types/:id`, which is what it always was. Links to the old URL will 404. The legacy singular `/item/:id` redirects to the new address rather than rendering a second copy of the same page, so there is one canonical URL and one forwarding rule.
- **An item's own page is community-scoped**, at `/communities/:communityId/items/:itemId`, so it sits inside that community's navigation instead of dropping the reader into global nav mid-browse. An item belongs to exactly one community, so a URL naming a different one redirects to the right address.
- **Inventory tiles** link to the item when a member holds exactly one, and to the catalogue entry when the tile groups several — three potions do not share a history, so pointing at one of them would be a lie.

## [v11.0.0] - 2026-08-30

### Added

- **Item Ledger page** (`/communities/:communityId/items/ledger`): every item movement in a community, with kind filter chips, search, and pagination. Linked from the community sidebar under **Community**, not Administration — any member can read it.

  Rows arrive one per item and are collapsed by `batchId`, so a grant of twelve shows as one line reading `+12`. A batch split across a page boundary shows as two lines until the next page loads, which self-corrects on "Load more".

  Staff notes render inline under the public reason. The page gates nothing itself — the server returns null for viewers without item permissions, so the same document serves both audiences.

### Tests

- `src/lib/itemDisplay.ts` extracted from the two pages so `groupIntoStacks` and `collapseByBatch` can be tested directly, with 9 unit tests covering rollup, ordering stability, and the partial-page batch count.

### Changed

- **Inventory tiles roll items up by type.** Items are now one row per instance, so three potions arrive as three items and the page groups them into one tile reading ×3. Insertion order is preserved, so gaining a second copy of something does not reshuffle the grid.
- **Item type form drops the Stackable and Max Stack Size fields**, along with the matching badges on the admin grid and the item type page. Neither described anything the database does any more.

### Fixed

- **Item card borders rendered an object instead of a colour.** `CommunityInventoryPage` passed `itemType.color` — a `{ id, name, hexCode }` object — into a `color?: string` styled-component prop. Now passes `color.hexCode`. The item was typed `any`, which is why nothing caught it.
- **Editing an item type prefilled two fields that do not exist on it.** The edit modal read `itemType.imageUrl` and `itemType.iconUrl`; `ItemType` exposes neither, so both were always `undefined`. Also hidden by an `any`.

## [v10.2.0] - 2026-08-29

### Added

- **Tests for the species/variant/trait admin pages** (`src/pages/__tests__/`): `route-param-guards.test.tsx` covers all six pages that had conditional hooks — each asserts the guard message renders when the route param is missing, and that hook order survives the param disappearing between renders on a single mounted instance. That second assertion is the regression test proper: run against the pre-fix components it fails on all six with React's "Rendered fewer hooks than expected." `SpeciesManagementPage.test.tsx` covers the happy path, so the `skip` flags the queries gained are exercised in both states. 29 frontend tests total, up from 14.

- **Character admin action strip**: Edit / Remove from Species / Delete Character buttons render inside the character info column under an "ADMIN" label, gated by `canDeleteCharacter` and `canEditCharacterRegistry` (or global admin). (#235)
- **Trait Review Queue inline actions**: Review cards expose Remove from Species and Delete Character alongside Approve, each with a confirm dialog and toast feedback, so moderators never need to leave the queue. The queue refreshes after every action. (#235)
- `canDeleteCharacter` is exposed through the role queries, `useUserCommunityRole`, the permissions helper, and the RoleEditor presets. (#235)
- **ToyHouse account linking UI**: "Link ToyHouse Account" button on the Edit Profile page initiates the OAuth2 flow. Linked accounts are shown in the Connected Accounts section with a "TH" badge. On successful callback, shows a success toast and (if pending items were claimed) a summary of claimed characters/items. (#242)

### Fixed

- **`test-utils.tsx` no longer disables Apollo's `addTypename`**: the shared test wrapper passed `addTypename={false}`, which makes any mock omitting `__typename` fail *silently* — the query resolves, nothing is logged, and the component renders as though the server returned nothing. It cost real debugging time while writing the page tests above. The wrapper now uses the default, and the mock factories carry `__typename`.

  `createMockUser` is typed as `MeQuery["me"]` and a new `createMockUpdatedProfile` as `UpdateProfileMutation["updateProfile"]`, so a field the query gains later is a compile error in the factory rather than a runtime warning. Both were missing fields the queries already selected (`avatarImage`, `canListUsers`, `communityMemberships` and the other permission flags), and the `EditProfilePage` mutation mocks still set a long-removed `avatarUrl`. The frontend suite now runs with **zero** Apollo "missing field" errors, down from several per run.
- **Removed two no-op options from the test `render` helper**: `user` and `initialEntries` were accepted, documented, and then silently dropped — `MockAuthProvider` ignored the user it was handed, and the wrapper used `BrowserRouter` with no way to seed history. Nothing passed either. Documented the actual pattern (supply the user through a `ME_QUERY` mock) in `src/__tests__/README.md` instead.

- **Hooks are no longer called conditionally in six page components**: `SpeciesManagementPage`, `SpeciesVariantManagementPage`, `TraitBuilderPage`, `VariantDetailPage`, `EnumValueManagementPage` and `EnumValueSettingsPage` each ran an early `return` for a missing route param *before* their hooks. A render that hit the guard therefore called a different number of hooks than one that did not — the exact hazard `react-hooks/rules-of-hooks` exists to catch, and 40 violations of it.

  These never crashed in practice because the guard cannot fire on a matched route: React Router only renders the component when the param is present. The bug was latent, and would have surfaced the first time one of these pages was rendered from a route whose param was optional.

  The guard now runs after the last hook, with the queries that consumed the param passing `skip` rather than firing with a placeholder. Placing it before the event handlers keeps the param narrowed to `string` for the closures below, so no non-null assertions were needed — several existing ones were removed.

  Verified by driving the running app: all six pages render against seeded data with no console errors, including `VariantDetailPage`'s dependent query chain (variant → `speciesId` → traits) and trait creation through `TraitBuilderPage`. None of these pages have unit or E2E coverage, so this was checked by hand rather than by the suite.
- **`VariantDetailPage.handleAddTrait` no longer asserts non-null on an optional chain**: `...nodes.find(...)?.valueType!` would have sent `undefined` as the required `valueType` had the trait been absent from the loaded species traits. It now looks the trait up, and bails with a toast if it is missing.
- **Hardened session restore against a partially-populated token store**: `AuthProvider`'s mount effect called `setLoading(false)` whenever `refreshToken` was absent — before the `me` query had resolved — so `ProtectedRoute` saw `loading: false` with `user: null` and redirected to `/login` even when the access token was valid. The effect now only clears `loading` when nothing is in flight.

  This is defensive, not a user-facing fix: no application path produces an access token without a refresh token. `login`/`signup` write both, `refreshAccessToken` overwrites only the access token and leaves the refresh token in place, and `logout` and the Apollo 401 handler clear both. It matters only if that state is reached some other way (storage cleared by hand or by an extension, or a future client that stores only what it needs). Covered by `apps/e2e/tests/smoke/session-restore.e2e.ts`, including a negative case asserting an invalid token still redirects. (#235)
- Added two `data-testid` container attributes for the browser E2E suite: `character-admin-actions` on the character page's admin strip and `trait-review-card` (with `data-character-id`) on trait review rows. Both mark elements that have no accessible role and no unambiguous text; everything else is selected by role or href. (#235)
- Scoped `vitest.config.ts`'s `include` to `src/**`, so Vitest's defaults cannot collect Playwright specs. (#235)
- Regenerated GraphQL codegen output so `ExternalAccountProvider` includes `TOYHOUSE`, keeping the generated types in sync with the backend schema. Also drops the phantom `ModerationStatus.Cancelled` member, which had no backing migration on `main`.
- Enabled `incremental` type-checking (`tsconfig.json`), cutting a no-change `tsc --noEmit` from ~22s to ~3s locally and in CI. `*.tsbuildinfo` is already gitignored.

## [v10.1.0] - 2026-05-12

### Added

- **Trait clarifiers**: Species managers can enable per-trait clarifier text from the trait builder. When enabled, character trait values accept an optional free-text clarifier rendered parenthetically (e.g., `Common Body Mod (extra horns)`) in displays, editor chips, and trait review diffs. (#228)

## [v10.0.0] - 2026-02-27

### Removed

- **User location field**: Removed location input from the Edit Profile form and location display from user profile pages (#223)

## [v9.3.0] - 2026-02-26

### Added

- **DeviantArt UUID Backfill admin UI**: Site admins can trigger and monitor the DA username-to-UUID backfill job with real-time progress bar, stats, scrollable log with character links, and cancel support

### Fixed

- **Pending ownership display name**: Character page now shows the display identifier (username) instead of the raw provider account ID for pending ownership badges

## [v9.2.1] - 2026-02-23

### Fixed

- **Trait review queue images cropped**: Images in the trait review queue are no longer cropped; use `object-fit: contain` instead of `cover` and remove fixed 16/9 aspect ratio (#209)

## [v9.2.0] - 2026-02-22

### Added

- **Trait Review Queue**: Dedicated moderation page for reviewing character trait values
  - Review cards show character image, name (linked to character page), species, variant, source badge, and trait diff
  - Approve button confirms traits and clears the "Traits Pending Review" badge
  - Revert button (hidden for CREATION and IMPORT-source reviews) opens a modal to roll back traits with a required reason
  - Character page shows "Traits Pending Review" / "Traits Rejected" badges based on review status
  - Paginated queue with pending count badge and refresh
- **Separate moderation pages**: Split Image Moderation and Trait Review into dedicated pages with their own sidebar links and spotlight actions (note: image moderation URL changed from `/moderation` to `/moderation/images`)

### Tests

- `src/lib/itemDisplay.ts` extracted from the two pages so `groupIntoStacks` and `collapseByBatch` can be tested directly, with 9 unit tests covering rollup, ordering stability, and the partial-page batch count.

### Changed

- **Character delete button hidden**: Removed the delete button from the character page UI

## [v9.1.1] - 2026-02-09

### Fixed

- **Sidebar shows user-specific sections when not logged in**: Hide My Content, Liked, Activity Feed, My Profile, and user community list from the sidebar when not authenticated (#84)
- **Character search**: Fixed an error when using advanced search with empty price filters (#167)
- **Long text overflow in media cards and detail pages**: Titles and descriptions with long unbroken strings now wrap correctly instead of overflowing their containers (#10)
- **Raw markdown visible in media card descriptions**: Card previews now strip markdown syntax and display clean plain text instead of showing raw `**bold**` and `[link](url)` syntax

## [v9.1.0] - 2026-02-09

### Added

- **Markdown support for media descriptions**: Image captions and descriptions now support bold, italic, headings, links, lists, and other markdown formatting with a live preview toggle
- **Markdown links open safely**: Links in rendered markdown open in a new tab so users are never navigated away unexpectedly

### Tests

- `src/lib/itemDisplay.ts` extracted from the two pages so `groupIntoStacks` and `collapseByBatch` can be tested directly, with 9 unit tests covering rollup, ordering stability, and the partial-page batch count.

### Changed

- **Media description limit increased**: Description fields now allow up to 3,000 characters (previously 1,000)

## [v9.0.0] - 2026-02-09

### Tests

- `src/lib/itemDisplay.ts` extracted from the two pages so `groupIntoStacks` and `collapseByBatch` can be tested directly, with 9 unit tests covering rollup, ordering stability, and the partial-page batch count.

### Changed

- **Simplified image upload form**: Hide visibility/privacy settings, limit artist credits to off-site only, remove multi-artist support, require character selection, and limit to single image upload at a time
- **NSFW uploads blocked**: Show warning and disable upload button when any NSFW flag is checked

## [v8.2.0] - 2026-02-09

### Added

- **Title field on upload form**: Users can set a custom title when uploading images; defaults to original filename if left blank

### Tests

- `src/lib/itemDisplay.ts` extracted from the two pages so `groupIntoStacks` and `collapseByBatch` can be tested directly, with 9 unit tests covering rollup, ordering stability, and the partial-page batch count.

### Changed

- **Remove `filename` from GraphQL queries**: All frontend queries updated to reflect `Image.filename` removal from the API
- **Upload success screen shows media title**: Success cards display the media title instead of UUID filenames

### Fixed

- **Broken Image Preview on Post-Upload Screen**: Fixed image preview not rendering after uploading images (#166)

## [v8.1.1] - 2026-02-08

### Fixed

- **Admin Navigation Visibility**: Gate each admin sidebar item by its specific permission instead of broad checks
  - Moderation link now uses `canModerateImages` (was `canRemoveCommunityMember`)
  - Items link now gated by `canManageItems || canGrantItems`
  - Dashboard link gated by `canRemoveCommunityMember || canManageMemberRoles`
  - Spotlight search moderation action uses `canModerateImages`
  - Added `canManageItems`, `canGrantItems`, `canModerateImages` to community membership query

## [v8.1.0] - 2026-02-08

### Added

- **Fuzzy Page Navigation (Ctrl+K / Cmd+K)**: Spotlight search to jump to any page instantly
  - "Find page..." trigger button in both global and community navigation sidebars
  - Fuzzy matching with highlighted results, grouped by category
  - Platform-aware keyboard shortcut badge (Cmd+K on macOS, Ctrl+K elsewhere, hidden on mobile)

### Fixed

- Improved rendering performance across the site by scoping CSS transitions and memoizing context values

- **Image Moderation Queue**: Moderators can review, approve, or reject pending images
  - Rejection reasons with optional explanation
  - Added `canModerateImages` to role permissions

## [v8.0.0] - 2026-02-01

### Added

- **Faceted Character Editing Permissions**: Separate UI controls for Profile vs Registry editing
  - Added `canEditOwnCharacterRegistry` and `canEditCharacterRegistry` to role management UI
  - Updated permission descriptions to clarify Profile vs Registry field access
  - Added "Species Details" section to character edit with Official Identifier field and traits
  - Profile fields disabled for users with only registry permissions (and vice versa)
- **Upload Character Images Permissions**: New permissions for controlling image upload character selection
  - Added `canUploadOwnCharacterImages` and `canUploadCharacterImages` to permission UI
  - Centralized type-safe permission definitions in `lib/permissions.ts`

### Tests

- `src/lib/itemDisplay.ts` extracted from the two pages so `groupIntoStacks` and `collapseByBatch` can be tested directly, with 9 unit tests covering rollup, ordering stability, and the partial-page batch count.

### Changed

- Character edit/create now uses `updateCharacterProfile`, `updateCharacterRegistry`, and `assignCharacterSpecies` mutations

### Fixed

- **RoleEditor permission checkboxes not reflecting saved state**: Fixed bug where `canEditOwnCharacterRegistry` and `canEditCharacterRegistry` checkboxes weren't checked when editing existing roles. Refactored to use `PermissionKey` type and dynamic initialization from `ALL_PERMISSIONS` to prevent future permission sync issues.

## [v7.0.0] - 2025-11-13

### Added

- **Item Type Image Upload (#160)**: Added image upload functionality for item types
  - Upload images directly in item type create/edit modals
  - Single image support for item types
  - Images displayed on item type cards & inventory
- **Admin Copy ID Buttons**: Copy ID buttons on character cards and item type cards for admins
- **Image Upload System**: Complete image upload functionality with S3 storage integration
  - Upload page with character and gallery association
  - Image preview during upload with metadata display
  - S3-backed storage with CloudFront CDN delivery
  - Support for PNG, JPG, WebP, and animated GIF formats
  - Three image variants generated: original (full resolution), medium (800px web-optimized), thumbnail (300px)
- **Media Display Improvements**: Enhanced image viewing experience
  - Media detail page now displays web-optimized medium variant for faster loading
  - "View Original" link to download/view full resolution image in new tab
  - Shows image dimensions in original link
- **Character Search in Typeahead**: Character selection dropdown now supports real-time search filtering
  - Debounced search with case-insensitive matching
  - Search filters character list as you type
  - Only searches characters you can edit

### Fixed

- **Card Navigation Browser Shortcuts (#154)**: Fixed card components to support browser shortcuts (ctrl+click, middle-click, right-click "Open in new tab")
  - Converted CharacterCard, MediaCard, and GalleryCard from `<div onClick>` to semantic `<Link>` elements
  - Enables proper browser navigation shortcuts on all clickable cards
  - Improves accessibility and user experience
- **Markdown Line Breaks (#149)**: Replaced manual markdown parsing with `react-markdown`
  - This will significantly enhance the markdown features available, and enables preserving linebreaks.
- **Character Creation Ownership Bug**: Fixed "Leave Unassigned" option not working when creating characters
  - Characters are now properly created without owner when "Leave Unassigned" is selected
  - Only applies to users with orphaned character creation permission
- **Type Safety Improvements**: Fixed various TypeScript errors and improved type safety across components
  - Proper null/undefined handling for optional fields
  - Fixed GraphQL type generation for character queries

## [v6.1.0] - 2025-11-06

## [v6.0.0] - 2025-11-03

### Added

- **Custom Fields System (#130)**: Replaced hardcoded age/gender fields with flexible custom fields
  - New `CustomFieldsEditor` component for managing key-value pairs
  - Users can add, edit, and remove custom fields dynamically
  - Works across Create, CreateEnhanced, and Edit character pages
  - Clean vertical label-above-value display layout
  - UPPERCASE field labels with strong visual hierarchy
  - Fields displayed in dedicated "Fields" section on character detail page

### Fixed

- **Custom Fields Editor (#130)**: Fixed "+ Add Field" button not working
  - Used temporary placeholder keys (`__empty_${index}`) to preserve empty fields in state
  - Filter out temporary keys during form submission
- **Custom Fields Display (#130)**: Fixed character-by-character JSON display issue
  - Resolved double-encoding bug where `customFields` was stringified twice
  - Backend now parses JSON string before storing in Prisma to prevent double-encoding
  - Display now correctly shows key-value pairs instead of individual JSON characters

## [v5.0.0] - 2025-11-02

### Added

- **Character Ownership Editing (#125)**: Users with `canCreateOrphanedCharacter` permission can now edit ownership of any character (not just orphaned ones)

  - Ownership section now appears for all characters with a species (removed orphaned-only restriction)
  - Support for three ownership states: orphaned (no owner), assigned to registered user, or orphaned with pending external claim
  - Ownership changes create audit trail records (`CharacterOwnershipChange`)
  - Uses GraphQL wrapper input types (`ownerIdUpdate`, `pendingOwnerUpdate`) to properly distinguish "set to null" from "don't change"
  - Backend permission validation ensures only authorized users can modify ownership

- **Discord OAuth Account Linking (#127)**: Added Discord account linking functionality
  - Added Discord OAuth callback page (`/auth/discord/callback`) for handling OAuth redirects
  - Added "Link Discord Account" button to Edit Profile page
  - Added Discord accounts display with "DC" badge icon
  - Supports both modern (@username) and legacy (username#1234) Discord username formats
  - Follows same OAuth security pattern as DeviantArt integration
- **Orphaned Character Creation (#125)**: Added ability to create characters without immediate owner assignment
  - Radio button interface for selecting "Assign to me" vs "Create without owner"
  - Pending ownership section for specifying external account (DeviantArt or Discord username)
  - Integration with community permission system (`canCreateOrphanedCharacter`)
  - Character cards display pending ownership status when orphaned
- **Discord Guild Integration (#125)**: Community Discord server linking for pending ownership
  - Discord Integration Settings in Community Settings page
  - Guild ID configuration with live guild name and member count display
  - Automatic username resolution for pending ownership claims
- **Permission Management UI (#125)**: Added orphaned character permission to role management
  - `canCreateOrphanedCharacter` toggle in Permission Matrix
  - Role Editor integration for permission assignment
  - Role list display shows orphaned character permission status

### Tests

- `src/lib/itemDisplay.ts` extracted from the two pages so `groupIntoStacks` and `collapseByBatch` can be tested directly, with 9 unit tests covering rollup, ordering stability, and the partial-page batch count.

### Changed

- **Character Creation UX (#125)**: Moved Character Ownership section below Species Selection for more logical form flow

## [v4.2.0] - 2025-10-28

### Added

- **Community Color Palette Management**: Visual color palette administration interface
  - `CommunityColorPalettePage` for creating, editing, and deleting community colors
  - Color picker with hex code input and live preview
  - Real-time color palette updates with sortable color list
- **Color Assignment System**: Color selection and display across entity management
  - `ColorSelector` component for color dropdown with preview
  - `ColorPip` component for visual color indicators (small/medium/large sizes)
  - Color assignment integrated in trait builder, variant management, enum value editor, and item type admin
- **Color Display Features**: Visual color indicators throughout the application
  - Color pips on character detail pages for enum trait values
  - Color pips on character edit pages for multi-value trait chips
  - Color pips on trait cards in trait builder
  - Color pips on variant cards and item type cards
  - Consistent color pip sizing and positioning across all displays

### Tests

- `src/lib/itemDisplay.ts` extracted from the two pages so `groupIntoStacks` and `collapseByBatch` can be tested directly, with 9 unit tests covering rollup, ordering stability, and the partial-page batch count.

### Changed

- **GraphQL Fragments**: Updated fragments to include color fields for Traits, SpeciesVariants, EnumValues, and ItemTypes

### Fixed

- **Enum Value Modal**: Fixed form not detecting changes when only color is modified
- **Enum Value Form Reset**: Fixed form not resetting when switching between different enum values
- **Variant Color UI**: Improved variant color management layout
- **ColorSelector Layout**: Prevented layout shift in color preview
- **Save Button Placement**: Moved Save Changes button to header for better UX clarity

## [v4.1.0] - 2025-10-27

### Added

- **Character Trait Display**: Added trait visualization to character detail pages with type icons, multi-value chip display, and enum value name resolution

## [v4.0.1] - 2025-10-26

### Fixed

- **Enum Trait Management in Variant Detail Page (#116)**: Fixed three critical bugs preventing enum trait configuration
  - Added `enumValues` field to GraphQL `TraitListEntryDetails` fragment to fetch enum options
  - Changed default value dropdown to show all trait enum values instead of only enabled ones
  - Fixed backend `resolveDefaultDisplayValue` resolver to return enum default values instead of null
  - Enum Options section now renders with enable/disable toggles for each enum value
  - Users can set default enum values independently of which values are enabled/disabled

## [v4.0.0] - 2025-10-26

### Added

- **Comprehensive Variant Management Page (#105)**: Unified interface for all variant configuration in single page
  - New `VariantDetailPage` consolidating trait ordering, enum settings, and trait configuration
  - Drag-and-drop trait ordering with real-time visual feedback
  - Expandable trait rows showing required toggle, default values, and enum options
  - Inline variant name editing
  - Add/remove traits to/from variants with instant feedback
  - Separated active and inactive traits sections
  - Compact enum value management within trait rows
  - New reusable components: `TraitListEntryRow`, `TraitDefaultValueInput`, `InactiveTraitCard`
  - Simplified Species Variant Management page with single "Manage" button per variant
- **Trait Ordering Interface (#105)**: Visual trait display order management for species variants
  - Added `TraitOrderManager` component with drag-and-drop functionality using @dnd-kit library
  - Integrated trait order management into Species Variant Management Page
  - Visual drag handles, order badges, and real-time reordering preview
  - Save/reset controls for batch updating trait display order
  - Empty state messaging and loading indicators
  - Only accessible to species admins with proper permissions
  - Enables custom trait ordering in character creation/editing forms per variant
- **Character Edit Page with Species and Trait Management (#101)**: Added species/variant selection and comprehensive trait editing with read-only species display after assignment
- **Character Details Editor (#109)**: Added markdown editor component with live preview, syntax hints, and character counter for unified character details

### Tests

- `src/lib/itemDisplay.ts` extracted from the two pages so `groupIntoStacks` and `collapseByBatch` can be tested directly, with 9 unit tests covering rollup, ordering stability, and the partial-page batch count.

### Changed

- **Auth Flow (#98)**: Login/signup now fetch user data via separate 'me' query instead of returning it directly, enabling field-level authorization
- **Character Fields (#109)**: Removed description/personality/backstory displays from character cards and profile pages in favor of unified markdown details field

### Fixed

- **Missing Sidebar on Character Pages (#112)**: Fixed no sidebar appearing on character pages without species/community. Global navigation now shown as fallback.
- **Species Edit 404 Error (#91)**: Fixed Edit button in Species Management navigating to non-existent route. Added EditSpeciesPage for editing species name and hasImage flag. Thanks @Owlscape!

## [v3.0.0] - 2025-10-19

### Added

- **User Selection Typeahead (#43)**: Added performant user search and selection component
  - Integrated UserTypeahead component in Grant Item form replacing manual user ID entry
  - Added `GET_COMMUNITY_MEMBERS` GraphQL query with search and limit parameters
  - Implemented debounced search (300ms) with 2-character minimum for performance
  - Added visual user selection with avatar display and username/displayName
  - Improved UX for item granting workflow with intuitive user lookup
- **Community Item System UI (#43)**: Complete inventory management interface
  - Added Item Types Administration page (`/communities/{id}/admin/items`) for creating and managing item types
  - Added User Inventory page (`/communities/{id}/inventory`) displaying community-scoped items with quantity badges
  - Added Grant Item interface for admins to grant items to community members
  - Added visual item cards with color coding, icons, and category labels
  - GraphQL integration using `User.inventories(communityId)` query pattern
  - Item fragments and proper Apollo Client cache management
- **Dual-Sidebar Navigation System (#61)**: Context-aware navigation with community and global sidebars
  - Community sidebar with permission-aware navigation for species, administration, and community management
  - Global sidebar with quick access to personal content, liked items, browse sections, and communities
- **DeviantArt OAuth Account Linking (#62, #73)**: Complete external account linking UI
  - Added DeviantArt OAuth callback page (`/auth/deviantart/callback`) for handling OAuth redirects
  - Added external accounts management section to Edit Profile page
  - Added connected accounts display showing linked DeviantArt accounts with username
  - Added "Link DeviantArt Account" button with OAuth flow integration
  - Added ability to unlink DeviantArt accounts with confirmation

### Fixed

- **Role List Cache Invalidation (#69)**: Fixed role list not updating after creating or editing roles without page refresh
- **Join Community Button Functionality (#68)**: Fixed non-functional Join Community button on community detail page
  - Button now properly navigates to join community page when clicked
  - Added membership check to hide button for users already in the community
  - Manage button now only displays for community members
- **Invite Link Redirect for Authenticated Users (#66)**: Fixed invite links redirecting logged-in users to signup page
  - Users had to manually navigate to join community page and re-enter the invite code
  - Join community page now accepts and pre-fills invite code from URL parameter
  - Unauthenticated users maintain existing behavior (redirect to signup with pre-filled code)
- **Birthdate Field Display Issue (#44)**: Fixed birthdate not displaying in edit profile form

## [v2.0.0] - 2025-09-01

### Added

#### UI Core Entity Management System

- **Species Management Interface**: Comprehensive species creation and editing system
  - `SpeciesManagementPage` for viewing all community species with filtering and search
  - `SpeciesPage` for detailed species information with variant management
  - `SpeciesVariantManagementPage` for creating and editing species variants
  - Species creation forms with image support flags and community assignment
  - Breadcrumb navigation and role-based access control integration
- **Trait Builder System**: Advanced trait configuration interface supporting multiple value types
  - `TraitBuilderPage` with support for ENUM, STRING, INTEGER, and TIMESTAMP traits
  - Enum value management with ordering, color coding, and description support
  - `EnumValueManagementPage` for comprehensive enum option configuration
  - `EnumValueSettingsPage` for species variant-specific enum value availability
  - Matrix-style interface for configuring trait availability per species variant
- **Community Administration Suite**: Full community management and invitation system
  - `CommunityManagementPage` for community overview and member management
  - `CommunityAdminPage` for administrative controls and settings
  - `CommunityInviteCodesPage` and `SiteInviteCodesPage` for invite code management
  - `JoinCommunityPage` for existing users to join communities via invite codes
  - Real-time invite code validation with GraphQL integration
  - Community preview showing name and assigned role before joining
- **Site Administration Interface**: Global administrative controls
  - `SiteAdminPage` with card-based design for system-wide management
  - Global permission management and user administration interfaces
  - Centralized invite code oversight and community monitoring tools
- **Permission Management System**: Comprehensive role and permission administration
  - `PermissionManagementPage` integrating all permission management tools
  - `PermissionMatrix` component for visual permission overview
  - `RoleEditor` component with comprehensive role creation and editing capabilities
  - `RoleManagementTab` for organized role administration within communities
  - `PermissionSelector` for granular permission control and assignment
  - `RoleTemplateManager` for predefined role templates and quick setup
- **Enhanced Community Pages**: Extended community management capabilities
  - `CommunityMembersPage` for comprehensive member management and role assignment
  - `CommunityModerationPage` for content moderation and community oversight
  - `CommunitySettingsPage` for detailed community configuration options
  - `MyCommunitiesPage` for user's personal community dashboard
- **Character Creation Enhancement**: Advanced character creation with species integration
  - `CreateCharacterPageEnhanced` with dynamic species and trait integration
  - `SpeciesSelector` component for dynamic species selection with community filtering
  - `TraitForm` component for comprehensive trait value input and validation
  - `TraitValueEditor` for complex trait management with type-specific inputs

#### Enhanced UI Component Library

- **Core Components**: New reusable components with consistent theming
  - `Card` component family (Card, CardHeader, CardTitle, CardContent) with hover effects
  - `Modal` component with overlay, backdrop click handling, and accessibility features
  - `Input` component with error states, validation feedback, and ref forwarding
  - `Typography` component (H1-H6, Text, Caption) with theme integration
  - `ErrorMessage` component for consistent error display across forms
- **Component Improvements**: Enhanced existing components
  - `Button` component with improved variants, sizing, and loading states
  - Fixed React ref forwarding and styled-components prop issues
  - Added transient props (`$hasError`, `$variant`) to prevent DOM warnings
  - Improved form integration with react-hook-form library

#### Advanced GraphQL Integration

- **New Query Files**: Comprehensive GraphQL operations for entity management
  - `enhanced-species.graphql.ts` for advanced species queries with trait relationships
  - `species.graphql.ts` for species CRUD operations and variant management
  - `enumValues.graphql.ts` and `enumValueSettings.graphql.ts` for trait configuration
  - `communities.graphql.ts` and `inviteCodes.graphql.ts` for community management
  - `roles.graphql.ts` for comprehensive role and permission management operations
- **Generated Types**: Updated GraphQL TypeScript types with latest backend schema changes
- **Query Optimization**: Efficient data fetching patterns for admin interfaces

#### Community Invitation System

- **Dashboard Integration**: Added "Join Community" quick action button to dashboard for easy access
- **Invite Code Testing Flow**: Complete end-to-end testing of community invitation system
  - Enter invite code → Real-time validation → Community preview → Join confirmation → Success redirect
- Form validation using react-hook-form and zod schema validation
- Success notifications and automatic navigation to joined community

#### TypeScript Type Safety Improvements

- `MediaGridItem` interface using deep Pick utility types for minimal required media fields
- Proper TypeScript interfaces for nested GraphQL entity fields (`owner`, `image`, `textContent`)
- Enhanced type safety for media component props with strict typing
- Eliminated `any` type usage in media components to prevent runtime type errors

### Fixed

#### Media Gallery Issues

- **Media Type Filter Button Visibility (#12)**: Fixed filter buttons disappearing when no content exists for selected type
  - Root cause: Filter counts calculated from filtered results instead of total dataset
  - Solution: Separate GraphQL queries for display data vs. count data
  - Result: Filter buttons remain visible showing accurate counts (e.g., "Images (2)", "Text (0)")
- **Incorrect Media Type Counts**: Fixed media type counts showing as 0 despite having content
  - Frontend now uses backend-provided `imageCount` and `textCount` fields
  - Eliminated client-side count calculation that was prone to filtering errors
- **GraphQL Validation Error**: Fixed query validation failure when requesting media counts
  - Updated `CharacterMediaGallery` to use `limit: 1` instead of `limit: 0` for count queries
  - Maintains efficient count retrieval while satisfying backend validation constraints

#### Component Architecture

- **MediaCard Component**: Updated to use proper `MediaGridItem` type instead of full `Media` type
  - Eliminates unnecessary data fetching for display-only components
  - Improved component performance with minimal required props
- **MediaGrid Component**: Enhanced with proper TypeScript interfaces and error boundary handling
- **CharacterMediaGallery Component**: Refactored filtering logic to use separate queries for display vs. counts

### Tests

- `src/lib/itemDisplay.ts` extracted from the two pages so `groupIntoStacks` and `collapseByBatch` can be tested directly, with 9 unit tests covering rollup, ordering stability, and the partial-page batch count.

### Changed

#### Media Gallery Behavior

- **Filter Tab Functionality**: Filter tabs now accurately display total counts regardless of active filter
  - "All (5)" tab shows total media count
  - "Images (3)" tab shows total image count even when text filter is active
  - "Text (2)" tab shows total text count even when image filter is active
- **Query Optimization**: Implemented dual-query strategy for character media gallery
  - Main query fetches filtered media for display with specified limit
  - Count query fetches total counts without media type filter for accurate tab labels
  - Reduced client-side computation and improved data consistency

#### Component Props and Interfaces

- **MediaCard Props**: Simplified props interface with strict typing for media item structure
- **MediaGrid Props**: Enhanced with comprehensive prop validation and default value handling
- **CharacterMediaGallery Props**: Updated to support new count field requirements

#### Development Experience

- **Type Safety**: Eliminated type casting and `any` usage throughout media components
- **Code Maintainability**: Improved component interfaces with clear prop definitions and documentation
- **Error Prevention**: Enhanced TypeScript compilation to catch media-related type mismatches at build time

### Technical Debt Reduction

- **Removed Type Assertions**: Eliminated unsafe type casting in favor of proper interface definitions
- **Improved Component Reusability**: MediaGridItem interface allows flexible component usage across different contexts
- **Enhanced Prop Validation**: Added comprehensive TypeScript validation for all media component props

### Performance Improvements

- **Reduced Data Fetching**: MediaGridItem interface fetches only required fields for display components
- **Optimized Query Strategy**: Dual-query approach reduces unnecessary data transfer for count-only requirements
- **Component Rendering**: Improved rendering performance with minimal prop interfaces and reduced re-renders

## [v1.1.0] - 2025-08-12

### Added

- Character and media deletion functionality with confirmation dialogs
- Reusable `DeleteConfirmationDialog` component with themed styling
- Delete buttons on character and media detail pages for content owners
- Toast notifications for successful deletions and error handling
- Proper Apollo cache invalidation after deletions for real-time UI updates

### Fixed

- Missing delete options for characters and media (resolves issue #33)

## [v1.0.0] - 2025-01-12

### Tests

- `src/lib/itemDisplay.ts` extracted from the two pages so `groupIntoStacks` and `collapseByBatch` can be tested directly, with 9 unit tests covering rollup, ordering stability, and the partial-page batch count.

### Changed

- Minor internal breaking changes to tag system

## [v0.2.0] - 2025-01-12

### Added

- Advanced `TagInput` component with typeahead functionality and integrated chip display
- Tag chips with remove buttons (X) replacing comma-separated text input
- Real-time tag search with debounced API calls (300ms delay)
- Keyboard navigation support (Enter, Backspace, Arrow keys, Escape)
- `useTagSearch` hook for managing tag search state and API integration
- Visual tag chip design with purple styling and hover effects
- Support for creating new tags and selecting from existing suggestions

### Tests

- `src/lib/itemDisplay.ts` extracted from the two pages so `groupIntoStacks` and `collapseByBatch` can be tested directly, with 9 unit tests covering rollup, ordering stability, and the partial-page batch count.

### Changed

- Replaced comma-separated tag input with modern chip-based interface in character forms
- Enhanced character creation and editing forms with improved tag UX
- Updated form validation to handle tags as arrays instead of comma-separated strings
- Improved tag discoverability and user experience

### Fixed

- Styled-components DOM prop warnings in TagInput component using transient props
- Proper focus management and accessibility in tag input interface
- Form state management for tags in both create and edit character pages

### Technical

- Enhanced UI package with reusable TagInput component
- Updated GraphQL integration with new searchTags query
- Improved TypeScript types and interfaces for tag management

## [v0.1.0] - 2025-01-11

### Added

- Tag editing functionality in character edit form
- Reusable `Tag` component with multiple variants (default, primary, success, warning, error)
- Reusable `TagsContainer` component for consistent tag layouts
- Tag display in CharacterCard components with smart truncation (first 3 tags + "+X" indicator)
- Tag display in character detail pages with dedicated Tags section
- Support for custom tag colors from backend tag objects
- Size variants for tags (sm, md) for different contexts
- Hover effects and accessibility features (roles, tab indexes)

### Fixed

- Missing tag editing capability in character edit form
- Character edit form missing tags field and validation
- Character detail page not displaying simple tag arrays as fallback

### Tests

- `src/lib/itemDisplay.ts` extracted from the two pages so `groupIntoStacks` and `collapseByBatch` can be tested directly, with 9 unit tests covering rollup, ordering stability, and the partial-page batch count.

### Changed

- Enhanced character edit form with Tags section matching create form styling
- Character detail page now supports both `tags_rel` (complex objects) and `tags` (simple arrays)
- Improved tag processing with comma-separated string to array conversion

## [v0.0.2] - 2025-08-10

### Tests

- `src/lib/itemDisplay.ts` extracted from the two pages so `groupIntoStacks` and `collapseByBatch` can be tested directly, with 9 unit tests covering rollup, ordering stability, and the partial-page batch count.

### Changed

- No frontend-specific changes in this release

## [v0.0.1] - 2025-08-10

### Added

- React-based user interface with TypeScript
- Apollo GraphQL client integration
- Character creation and management pages
- Media upload and editing functionality
- Gallery creation and browsing
- User authentication and profile management
- Social features including likes, follows, and comments
- Advanced search and filtering capabilities
- Responsive design with theme support
- Comprehensive form validation

### Fixed

- Media edit form schema validation conflicts
- Character sale price input validation
- Image URL routing from /image/ to /media/
- Page scroll behavior in media upload flow

### Tests

- `src/lib/itemDisplay.ts` extracted from the two pages so `groupIntoStacks` and `collapseByBatch` can be tested directly, with 9 unit tests covering rollup, ordering stability, and the partial-page batch count.

### Changed

- Updated navigation from "Images" to "Media" for unified content support
- Simplified character media upload experience
- Enhanced media editing with artist metadata fields
