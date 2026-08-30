# Backend Changelog

All notable changes to the backend application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- **An award could mint another community's currency.** `approveImage` checked
  `canGrantItems` against the *image's* community but passed the caller's
  `currencyId` through unvalidated, and `credit()` scopes membership to the
  *currency's* community — where the recipient is a legitimate member. So a
  moderator of a small community who was merely a member of a large one could
  approve any image in the small one while naming the large one's currency,
  and mint it to themselves. The award now verifies the currency belongs to
  the image's community, and that every recipient is actually connected to the
  media. Both are covered by tests confirmed to fail against the unfixed code.

### Fixed

- **`credit()` no longer takes a second pool connection inside a caller's
  transaction.** `loadWritableCurrency`, `findMembers` and `ensureBalanceRows`
  ran on the pool while the caller's interactive transaction held a connection
  of its own. Enough concurrent callers and every connection is held by a
  transaction waiting for one that only another waiting transaction could
  release, until the pool times all of them out. They now run on the client
  they are given.

  `ensureBalanceRows` moving inside the transaction also corrects a comment
  that contradicted itself: `ON CONFLICT DO NOTHING` is precisely the
  construct that does *not* raise a unique violation, so the stated reason for
  keeping it outside was never valid.

- **`ImageModerationAction.currencyAwards` reported a previous approval's
  payout.** It matched only on the media, so a rejection of a previously
  awarded image returned a non-empty list, contradicting the field's own
  description. It now returns nothing for anything but an approval.

- **`mapPrismaUserToGraphQL` no longer requires `passwordHash`**, which it
  never read. Requiring it forced every caller to SELECT it; award recipients
  now leave it in the database.

### Added

- **`CurrencyTransaction.source` / `.sourceId`**: what caused a ledger row.
  Until now currency had no notion of a cause, so an award could only say
  "+25, upload approved" — telling a member nothing about which upload and
  giving an auditor no way to tell forty approvals apart. The item ledger
  never had this problem because every `ItemTransaction` names its item.

  `sourceId` holds the **media**, not the image. An image is an implementation
  detail of a media: a deleted media means the upload is gone as far as anyone
  is concerned, so pointing at the surviving image would name something with
  no user-facing existence — and there is no page for one either.

  Deliberately not a foreign key. A ledger row must outlive whatever caused
  it, and a cascade that erased coin along with a deleted media would be far
  worse than a dangling id. A CHECK keeps the pair coherent: `DIRECT` exactly
  when `sourceId` is null.

- **`CurrencyLedgerService.credit()`** generalises `mint()`: per-recipient
  amounts in one batch, an optional caller transaction, and an opt-in to skip
  non-members. Per-recipient amounts matter because paying the artist more
  than the uploader is a real case that must still read as a single event.
  `mint()` delegates to it; all existing currency tests pass untouched.

- **`Media.awardRecipients`**: the deduplicated people who could be paid for a
  media, each with their relations and whether currency can reach them.
  Returns null — via the existing `NullOnForbiddenFilter` pattern — for
  viewers without `canGrantItems`, so the moderation queue still loads for
  moderators who only moderate.

- **`ImageModerationAction.currencyAwards`**: what an approval paid, read back
  off the ledger rather than stored twice, so the two cannot disagree.

### Changed

- **`approveImage` accepts an optional award** and runs in an interactive
  transaction rather than the array form, so the approval and the payment
  commit together. Approved-but-unpaid and paid-but-unapproved are both worse
  than the whole thing failing. The mutation re-checks `canGrantItems`: the
  widget is hidden from moderators who lack it, but hiding a control is not a
  check.

### Tests

- **First tests for the image moderation service** — approve and reject had no
  coverage at all. 261 backend tests, up from 237.

- The shared `$transaction` mock now supports both forms Prisma offers. It
  only knew the interactive callback form, so any test touching a code path
  that used the array form failed with "callback is not a function".

- **`Community.memberCount`** field resolver, readable unauthenticated like the
  `community` query itself.

## [v11.3.0] - 2026-08-30

## [v11.2.0] - 2026-08-30

### Added

- **`Currency`, `CurrencyBalance`, `CurrencyTransaction`** with queries
  `currencies`, `currency`, `currencySupply`, `memberWallet`,
  `currencyTransactions`, `currencyHolders`, and mutations `createCurrency`,
  `updateCurrency`, `mintCurrency`, `burnCurrency`, `transferCurrency`.

  Reads are gated on community membership; writes on item permissions. Reading
  is public within a community for the same reason item provenance is: an
  economy nobody can inspect cannot be argued with, and a member about to trade
  needs to see who holds what. Staff notes are resolved per viewer and returned
  as null to anyone without item permissions, and are excluded from the search
  filter so a member cannot probe for a note they cannot read.

- **Balances are stored, not summed from the ledger.** They are read on every
  surface showing a price and written far less often. They move only by
  `UPDATE ... SET amount = amount + n RETURNING amount` inside the same
  transaction as the row explaining them, and `balanceAfter` records what that
  statement returned — so the two can be checked against each other rather than
  merely trusted.

- **A transfer is two signed rows sharing a batch id**, one per side. Each
  member's own statement then reads correctly alone, and a community-wide view
  can still collapse the pair into one line. A bulk grant also shares a batch
  id but is never collapsed: each recipient received their own coin.

- **Spending burns.** There is no treasury, because a treasury balance nobody
  can see or spend is a number that only grows. `SPEND` is deliberately a
  separate kind from `BURN`: a member buying something and staff taking coin
  away are different events, and collapsing them would make a shop look like a
  punishment in the member's own statement.

### Migration

- **`20260830105842_community_currency`** carries five CHECK constraints
  Prisma cannot express, written by hand:

  1. **A balance may not go negative.** This is not a belt over the service's
     own check — "read the balance, compare, then write" races two concurrent
     spends and lets both through. The constraint is evaluated by the same
     statement that does the decrement, so the loser gets an error rather than
     an overdraft.
  2. A ledger row must move a non-zero amount.
  3. A row names at most one kind of actor (a user, or a label, never both).
  4. A counterparty is present exactly when the kind is `TRANSFER`.
  5. The sign agrees with the kind: `MINT` adds, `BURN` and `SPEND` remove.

  All five were verified firing against real Postgres, along with the increment
  returning its post-value.

  **Note for future maintenance**: Prisma surfaces a CHECK violation as
  `PrismaClientUnknownRequestError` with *no* `code` field, so the overdraft
  path is detected by matching the constraint name in the message. Matching on
  a Prisma error code would compile, pass a mocked test, and then show members
  a raw database error in production.

### Fixed

- **Deadlock avoidance in transfers and bulk grants.** Balance rows are touched
  in sorted user-id order rather than sender-first. Each `UPDATE` holds its row
  lock until commit, so ordering by the direction of the transfer would mean A
  paying B while B pays A each held the row the other needed, and Postgres
  would break the tie by killing one of them.

### Tests

- `currency-ledger.service.spec.ts` (29) and `currencies.service.spec.ts` (18).

### Added

- **`itemEconomy(communityId)`**: per item type, live circulation, distinct holders, grants and revokes over the last 30 days, and how many are unclaimed. Circulation and holders are counted separately on purpose — three potions held by one person is three in circulation and one holder, and an unclaimed item counts toward circulation but toward nobody's holdings.

- **`memberHoldings(communityId, userId)`**: one member's live holdings, grouped by item type, with every individual item listed inside its group. Deliberately unpaginated: an inventory is a whole thing, and a count beside a truncated list is a lie.

### Fixed

- **`User.inventories` silently truncated at 20 items.** The field resolver called `findAllItems` without a limit, so it took the default of 20, then reported `totalItems` as the length of the truncated array — nothing in the result said it had been cut short. Anyone holding 21+ items in a community saw a partial inventory presented as complete. The holdings page now uses `memberHoldings`, which does not paginate; the old field is left in place for existing consumers.

## [v11.1.0] - 2026-08-30

### Added

- **`item(id)` query**: fetch one item, including a destroyed one. Membership-gated like `itemProvenance` — a history page is no use without the item it belongs to, and a destroyed item's page has to keep working, which is the whole point of revoking softly.

## [v11.0.0] - 2026-08-30

### Added

- **Item ledger**: New `ItemTransaction` model recording every item movement — `GRANT`, `REVOKE`, `TRANSFER`, `CLAIM`, `USE` — with the actor, both parties, and a reason. Every write path produces rows inside the same database transaction as the item mutation, including the SQS prize consumer and the pending-ownership claim job. Exposed as `itemTransactions(filters)` (a community's ledger) and `itemProvenance(itemId)` (one item's history).

  Reading is gated on **community membership only**, not on item permissions. That is deliberate: provenance is public within a community so it can act as a trust signal in member-to-member trades. Only the mutations that write rows stay permission-gated.

- **Public reason, private staff note**: Item mutations take a member-facing `reason` and a staff-only `staffNote`. `staffNote` is resolved per viewer and returns null unless the viewer holds `canManageItems` or `canGrantItems` in that community. It is also deliberately excluded from the ledger's `search` filter, so a member cannot probe for the contents of a note they cannot read.

- **`IMPORT` transaction kind**: written once, by the migration, for every item that already existed. It says only that the item predates the ledger — inventing a `GRANT` would put fabricated provenance on a page members can read, and an empty timeline reads to a member as a broken page rather than as missing history.

- **`batchSize` on ledger rows**: the true size of the event a row belongs to, counted server-side with one grouped query per page. Counting loaded rows instead is wrong the moment a batch straddles a page boundary — the migration writes one batch per pre-existing item, so a real ledger would have opened on "+25" for a batch of several hundred.

- **`batchId` on ledger rows**: Shared by every row one operation writes. One item movement is one row, so granting twelve tokens writes twelve rows; the frontend collapses them back into a single line by grouping on this key rather than guessing from matching timestamps.

- **`reason` on `PrizeEventDto`**: Optional and additive — an existing Discord bot producer that omits it still validates, and the handler falls back to a generic reason.

### Tests

- `items.service.spec.ts` (17) and `item-transactions.service.spec.ts` (15): per-instance granting, the absence of any stack read, soft revoke, cross-type and cross-owner revoke refusals, staff notes excluded from search, batch-size reporting on a partial page, and ledger rows written through the caller's transaction client rather than the pool.

### Migration

- **`20260830045119_item_ledger_and_instances`** does the schema change and the data migration in one file, in a required order: stacks are expanded while `items.quantity` still exists, and genesis rows are written after `item_transactions` exists.

  1. **Expands stacks.** A row with quantity 3 keeps its own id and gains two siblings, so any id referenced elsewhere stays valid.
  2. **Carries pending ownership onto the siblings.** `pending_ownership.item_id` is UNIQUE — one record per item, not per stack. Without this step, expanding a pending stack of 3 leaves two items with a null owner and no pending record: unowned, unclaimable, invisible to every query, and a silent permanent loss of someone's prize.
  3. **Writes one `IMPORT` row per pre-existing item**, all sharing one batch id so the ledger shows the migration as a single event.

  Verified against seeded stacked data: 3 rows totalling 8 units became 8 items, a pending stack of 4 became 4 pending records with the provider account preserved, zero unclaimable items, and every item ended with exactly one ledger row.

  **This migration is not reversible.** Once stacks are expanded and `quantity` is dropped, nothing records which rows were one stack. Rolling back means restoring from a snapshot.

### Changed

- **Items are one row per instance. `Item.quantity` is gone.** Three potions are three rows.

  Stacking and provenance cannot both be true: a row whose quantity went 2 → 4 → 3 cannot answer which two of the three came from a given trade. Per-instance rows give every item one unbroken chain, which is the point of provenance being readable at all. Three things fall out: partial transfers become an owner reassignment rather than a decrement-here-increment-there that leaves neither row's history true; `Item.metadata` starts meaning something, having been incoherent on a stack of three; and the concurrent-grant race disappears, because granting N is N inserts with no read-then-write.

  **Breaking**: `grantItem` now returns `[Item!]!` rather than `Item!`. `UpdateItemInput` no longer accepts `quantity` — more items means `grantItem`, fewer means `revokeItems`.

- **`ItemType.isStackable` and `ItemType.maxStackSize` removed.** Stacking is now purely a presentation choice, so neither flag described anything the database did.

- **`deleteItem` replaced by `revokeItems(itemIds, reason, staffNote)`.** Soft, not hard: revoked items get `destroyedAt`/`destroyedById` and stay out of every inventory read, but keep their provenance readable — which is exactly the history a dispute wants. Mirrors how characters are deleted. `reason` is required because it is public. Takes a list because revoking two of someone's three potions means naming two specific items, and the whole revoke should land as one ledger event.

### Fixed

- **Item mutations were not permission-gated.** Every mutation in `items.resolver.ts` carried both `@AllowAnyAuthenticated()` and `@AllowCommunityPermission(...)`. The global guard ORs all permission decorators together, so the pair meant *authenticated OR permitted* — which is just *authenticated*. **Any logged-in user could create item types, grant items, and delete items in any community.** Removing `@AllowAnyAuthenticated()` from those handlers makes the community check bind.

  Only the item resolvers are fixed here.

- **Every failing GraphQL operation logged as a success.** The Apollo logging plugin in `app.module.ts` read `response.errors`, which Apollo 4 does not have — errors live under `response.body.singleResult`. The check was always falsy. Found by typing the plugin's `any` parameters against Apollo's own request-context types.

## [v10.2.0] - 2026-08-29

### Added

- **Character soft-delete and species removal**: New `deleteCharacter` (soft-delete, sets `deletedAt`/`deletedById`), `purgeCharacter` (hard-delete, global admin only), and `kickCharacterFromSpecies` (clears species/variant/registry and flattens trait values into custom fields) mutations. All three cancel any pending trait reviews. Adds the `CANCELLED` moderation status and the `canDeleteCharacter` role permission, granted to the default Admin role at community creation. (#235)

  Note a consequence worth knowing before granting the permission: `deleteCharacter` resolves its community from the character's species, and a character with no species resolves to none — so **once a character has been removed from its species it can only be deleted by a global admin**, not by the community moderator who removed it. This is inherent to how community permissions resolve, not a bug; it is stated in the mutation's schema description and pinned by a test in `characters.resolver.e2e.spec.ts`. (#235)
- **E2E test infrastructure**: `docker/compose.test.yml` runs an isolated Postgres container for e2e runs, started and stopped by a Jest global setup. Adds cross-service isolation coverage asserting soft-deleted characters are invisible to list/fetch queries, guards, galleries, comments, likes, and species deletion counts. (#235)
- **ToyHouse OAuth account linking**: Users can now link their ToyHouse accounts via OAuth2. Linked accounts trigger automatic claiming of pending character/item ownership registered to that ToyHouse username. (#242)

### Changed

- **Tracing can be switched off with `OTEL_SDK_DISABLED=true`** (`src/tracing.ts`). `main.ts` imports the tracing module unconditionally, and the module previously had no off switch, so a deployment without a collector left the OTLP exporter retrying forever and queueing spans in the backend's own heap.

  `NodeSDK` does honour `OTEL_SDK_DISABLED` on its own — it sets an internal `_disabled` flag in its constructor and `start()` returns early, so no tracer provider is registered and no export pipeline exists. But that check happens *after* our instrumentations have been constructed, and the Node `InstrumentationBase` constructor eagerly patches `http`/`express`/`graphql`/`winston` via require-in-the-middle. Those patches then emit into a no-op tracer: harmless and leak-free, but not free. Guarding in `tracing.ts` before anything is constructed makes a disabled deployment a true no-op.

  The value is parsed as `@opentelemetry/core` parses it — trimmed and lowercased, with only the literal `"true"` counting. **`OTEL_SDK_DISABLED=1` does not disable the SDK**; it logs a diagnostic warning and falls back to `false`.

  The `SIGTERM` handler is still registered when tracing is off. It is the only one in the process — `main.ts` does not call `enableShutdownHooks()` — so dropping it would leave the container to be `SIGKILL`ed on every deploy.

### Removed

- **`deleteAccount` mutation**: removed along with `UsersService.remove()`. It hard-deleted the user row and let FK cascades erase everything they touched — characters, galleries, media, comments, and ownership history where they were the recipient — with no confirmation, grace period, or audit trail. No UI ever called it and no operation document referenced it. Account removal, if it returns, should be a deliberate reversible flow rather than a single unconfirmed mutation. (#235)

### Fixed

- **Tag counts included soft-deleted characters**: `TagsService` counted every `CharacterTag` row, so a deleted character kept inflating tag popularity forever. Counts now filter on live characters. (Ordering by relation count remains unfiltered — Prisma cannot apply a `where` to a count used in `orderBy`.) (#235)
- **Ownership history broke on deleted characters**: `CharacterOwnershipChange.character` was non-nullable and did not catch `NotFoundException`. Before soft-delete these rows cascaded away with the character; now they persist, so any ownership-history query touching a deleted character threw. The field is now nullable and returns `null`, matching `GalleriesResolver.resolveCharacter`. (#235)
- **Deleting a user destroyed their characters**: `characters.owner_id` was `ON DELETE CASCADE`, so `deleteAccount` permanently erased every character a user owned — including soft-deleted ones and history other users depend on. Changed to `ON DELETE SET NULL`; characters survive as orphaned, which the codebase already models throughout. (#235)
- **`canDeleteCharacter` dropped by the role mappers**: `mapCreateRoleInputToService` and `mapUpdateRoleInputToService` omitted the field, so the permission could not be granted to or revoked from any custom role through the API. The mutation succeeded and silently returned `canDeleteCharacter: false`. Only the auto-created Admin role (set directly in `CommunitiesService.create`) and global admins had the permission. (#235)
- **Soft-delete filter coverage**: Every character `findUnique`/`findFirst`/`findMany`/`count` call site now applies the shared `notDeleted` filter from `common/utils/prisma-filters.ts`, so soft-deleted characters cannot leak through ownership checks, guards, galleries, comments, images, media, social, species, or trait review. (#235)
- **ENUM trait values stored as UUIDs**: `kickFromSpecies` now indexes the enum value map by both name and ID, so trait values resolve to their display name regardless of which path created them. (#235)
- **Circular module dependencies**: Added `forwardRef` between `AuthModule` and `UsersModule`/`ExternalAccountsModule`/`InviteCodesModule`/`CommunityMembersModule`, which previously broke module compilation when a feature module was loaded in isolation under test. (#235)
- `getPendingOwnershipCommunity` returns `null` instead of throwing when no community is found. (#235)
- **SQS enabled flag coercion**: `AWS_SQS_ENABLED=false` now correctly disables the SQS consumer. Previously, `ConfigService.get<boolean>()` returned the raw string `"false"` (truthy), so the consumer would start regardless of the flag value.
- **Phantom `CANCELLED` moderation status**: Removed `CANCELLED` from the generated `schema.gql`. The value has no migration on `main` (it belongs to the unmerged character soft-delete work), so it leaked into the committed schema from a locally generated Prisma client and advertised an enum value the deployed API does not serve.

## [v10.1.0] - 2026-05-12

### Added

- **Trait clarifiers**: Traits can now opt in to free-text clarifiers (`Trait.allowsClarifier`). Character trait values carry an optional per-value `clarifier` field that round-trips through GraphQL, validation, and trait review. (#228)

## [v10.0.0] - 2026-02-27

### Removed

- **User location field**: Removed `location` from the User entity, GraphQL schema, and update DTO.

## [v9.3.0] - 2026-02-26

### Fixed

- **DeviantArt pending ownership auto-claim**: DeviantArt usernames are now resolved to UUIDs via the DA API before storing in `pending_ownership`, fixing a mismatch that prevented auto-claim from ever working for DA accounts (#208)
- **Stale character return after creation**: `create()` now re-fetches the character after auto-claim so the response includes the correct `ownerId`

### Added

- **DeviantArt UUID backfill job**: Admin-triggered async job to backfill UUIDs on existing pending ownership records that have raw DA usernames, with auto-claim and progress reporting via GraphQL subscription
- **GraphQL subscriptions**: WebSocket support via `graphql-ws` for real-time progress updates
- **DeviantArtService**: New service for resolving DeviantArt usernames to UUIDs via client_credentials OAuth flow, with token caching

## [v9.2.1] - 2026-02-23

## [v9.2.0] - 2026-02-22

### Added

- **Trait Review System**: Moderation queue for reviewing character trait values
  - Trait values are applied to characters immediately at creation/import; the review queue lets moderators verify correctness
  - `approveTraitReview` mutation confirms traits and removes the "Traits Pending Review" badge
  - `revertTraitReview` mutation restores previous trait values with a required reason (unavailable for CREATION and IMPORT-source reviews)
  - `editAndApproveTraitReview` mutation allows moderators to correct trait values before approving
  - Review sources: CREATION, IMPORT, MYO, USER_EDIT
  - Paginated `traitReviewQueue` query with character metadata
  - Gated by `canEditCharacterRegistry` permission and global admin

### Fixed

- **Logging redaction filter**: GraphQL variable sanitization now recurses into nested objects, fixing a bug where sensitive data could be logged. (note: logs are stored securely, for a limited duration, and have not been accessed).
- **Image upload permissions**: Global admins can now upload images to any character regardless of community membership
- **`mediumUrl` not returned for images**: Image resolver now surfaces the `mediumUrl` field

### Changed

- **`deleteCharacter` restricted to global admins**: Removed character owner/editor access; only global administrators can delete characters

## [v9.1.1] - 2026-02-09

### Fixed

- **Species page**: Species pages now load for users who are not logged in (#174)
- **Community colors**: Fixed community color's community field not resolving
- **Character search**: Fixed an error when searching for characters (#167)
- **Case-sensitive email login**: Normalize emails to lowercase in login, signup, password reset, and user creation flows. Includes database migration to lowercase existing emails.
- **Emails not sending**: Fixed a bug preventing password reset, password changed, and image moderation emails from being sent.

## [v9.1.0] - 2026-02-09

### Added

- **Description length validation**: Added `@MaxLength(3000)` validation to `description` field in `CreateTextMediaInput` and `UpdateMediaInput` DTOs

## [v9.0.0] - 2026-02-09

## [v8.2.0] - 2026-02-09

### Added

- **Editable media title at upload**: Accept optional `title` field in upload endpoint; defaults to original filename

### Changed

- **Remove `filename` from GraphQL API**: The `Image.filename` field (UUID-based, not user-facing) is no longer exposed
- **Activity feed uses media titles**: IMAGE_UPLOADED feed items now show the media title instead of UUID filenames, and link to `/media/:id`

### Fixed

- **Artist credit not persisting on image upload**: Pass `artistId`, `artistName`, and `artistUrl` from the upload controller to the images service (#147)

## [v8.1.1] - 2026-02-08

## [v8.1.0] - 2026-02-08

### Added

- **Image Moderation System**: Uploaded images require moderator approval before becoming visible
  - Images show placeholder until approved
  - Approval/rejection with email notifications to uploaders
  - New `canModerateImages` community permission

## [v8.0.0] - 2026-02-01

### Added

- **Faceted Character Editing Permissions**: Separated character editing into Profile and Registry facets
  - Profile facet (owner-editable): name, details, visibility, trade settings, images, tags
  - Registry facet (admin-controlled): registryId, speciesVariantId, traitValues
  - New permissions `canEditOwnCharacterRegistry` and `canEditCharacterRegistry` for registry field access
  - New `updateCharacterProfile` mutation for profile fields (requires `canEditOwnCharacter`/`canEditCharacter`)
  - New `updateCharacterRegistry` mutation for registry fields (requires `canEditOwnCharacterRegistry`/`canEditCharacterRegistry`)
  - New `assignCharacterSpecies` mutation for initial species assignment (requires `canCreateCharacter`)
  - New `CharacterProfileEditGuard` and `CharacterRegistryEditGuard` for faceted permission checking
  - Updated findEditableCharacters query to include registry permissions
- **Character Registry ID**: New `registryId` field for official species identifiers
  - Unique per species (@@unique constraint on speciesId + registryId)
  - Stored as VARCHAR(100) for flexible identifier formats
- **Upload Character Images Permissions**: New granular permissions for image upload character selection
  - `canUploadOwnCharacterImages`: Controls ability to upload images to user's own characters within a community
  - `canUploadCharacterImages`: Controls ability to upload images to any character (admin-level permission)
  - Database migration adds permissions with `true` defaults for backward compatibility
  - `findCharactersForImageUpload` query filters characters based on these permissions

### Changed

- Replaced `updateCharacter` mutation with `updateCharacterProfile` (profile fields only)
- Replaced `updateCharacterTraits` mutation with `updateCharacterRegistry` (includes traits, registryId, variant)

## [v7.0.0] - 2025-11-13

### Added

- **Item Type Image Upload (#160)**: Added support for uploading images directly to item types
  - Added `itemTypeId` parameter to image upload endpoint
  - Automatically associates uploaded images with item types via `ItemType.imageId`
  - Permission checking via `CanManageItems` community permission
  - Images stored in S3 with same variant generation as other media
- **SQS Queue Consumer**: Implemented prize distribution system for Discord bot integration
  - Created queue consumer module that polls SQS for prize award events
  - Added item prize handler for granting existing item types to Discord users
  - Added character prize handler for transferring orphaned character ownership
  - Integrated with existing pending ownership system for auto-claiming
- **Image Upload System**: Complete S3-backed image upload implementation
  - Pre-generated UUID-based image IDs for S3 key generation (`{imageId}/{variant}.ext`)
  - Automatic generation of three image variants: original (full resolution), medium (800px web-optimized), and thumbnail (300px)
  - Smart format conversion for web optimization:
    - PNG → WebP for medium and thumbnail (smaller files, preserved transparency)
    - JPEG → JPEG optimized
    - GIF → GIF with preserved animation for medium, static JPEG thumbnail
    - WebP → WebP optimized
  - Support for PNG, JPG, WebP, and animated GIF formats
- **Character Search Filtering**: Added search parameter to editable characters query
  - Case-insensitive name search in `findEditableCharacters` service method
  - GraphQL `myEditableCharacters` query now accepts optional search filter
  - Enables real-time character typeahead search in frontend
- **Orphaned Image Cleanup**: Centralized image cleanup system with reference checking
  - `cleanupOrphanedImage()` method in ImagesService checks all references before deletion
  - Verifies image is not used by Media, User avatars, or ItemTypes
  - Automatically deletes from both S3 and database when orphaned
  - Called automatically when Media records are deleted
  - Prevents orphaned files accumulating in S3 storage

### Fixed

- **Unauthenticated Media Access**: Fixed `userHasLiked` field blocking unauthenticated users from viewing public media
- **Character Creation Ownership**: Fixed `assignToSelf` parameter not being respected
  - Characters now properly created without owner when `assignToSelf: false`
  - Works in conjunction with `canCreateOrphanedCharacter` permission
  - Supports both pending ownership and fully orphaned character creation

## [v6.1.0] - 2025-11-06

### Added

- **Password Reset (#64)**: Implemented forgot password and password reset functionality
  - Created email service with MailHog (dev) and AWS SES (production) support
  - Added password reset token model with SHA-256 hashing and 1-hour expiration
  - Implemented database-based rate limiting (3 requests per 15 minutes per user)
  - Email notifications sent for password reset requests and successful password changes
  - Frontend pages for forgot password and reset password flows
  - Added forgotPassword and resetPassword GraphQL mutations

### Changed

- **Discord Integration (#137)**: Migrated to REST-only approach (removed persistent WebSocket connection)

## [v6.0.0] - 2025-11-03

### Changed

- **Custom Fields System (#130)**: Removed hardcoded age and gender fields from Character model
  - Removed `age` and `gender` columns from database schema via migration
  - Existing `customFields` JSON column now used for flexible key-value data
  - Updated GraphQL schema to remove age/gender fields from all types and inputs
  - Updated seed data to use `customFields` for age/gender information

### Fixed

- **Custom Fields Encoding (#130)**: Fixed double-encoding issue in character resolver mappers
  - Now parses incoming JSON string before passing to Prisma's Json field
  - Prevents double-stringification that caused frontend display issues
  - Applies to both create and update character operations

## [v5.0.1] - 2025-11-02

### Fixed

- **Discord Guild Validation (#133)**: Fixed `validateDiscordGuild` query missing `communityId` parameter that `@ResolveCommunityFrom` decorator was expecting, preventing proper permission validation

## [v5.0.0] - 2025-11-02

### Fixed

- **Item Ownership Validation (#125)**: Prevent creating fully orphaned items
  - Items must now have either an owner or pending owner (cannot be completely orphaned)
  - Added validation in `ItemsService.grantItem()` to enforce rule
  - Added DTO validation using `@ValidateIf` to ensure at least one ownership field is provided
  - Returns clear error message when attempting to create item without ownership

### Changed

- **Centralized Auto-Claim Logic (#125)**: Moved pending ownership auto-claim logic into PendingOwnershipService
  - `createForCharacter` and `createForItem` now automatically claim if external account is already linked
  - Auto-claim works consistently for both character/item creation and updates
  - Removed inline auto-claim logic from character service (single source of truth)
  - Returns result indicating if entity was claimed or pending ownership was created

### Added

- **Character Ownership Management via Update Mutation (#125)**: Enhanced `updateCharacter` mutation with ownership control

  - Added `OwnerIdUpdate` and `PendingOwnerUpdate` wrapper input types to distinguish "set to null" from "don't change"
  - Users with `canCreateOrphanedCharacter` permission can modify ownership of any character (not just orphaned)
  - Support for orphaning characters (setting owner to null), transferring to users, and setting pending ownership
  - Ownership changes create audit trail records via `CharacterOwnershipChange` (except when orphaning)
  - Automatic pending ownership clearing when assigning actual owner
  - Backend permission validation in both resolver and service layers for defense-in-depth security

- **Discord OAuth Account Linking (#127)**: Added Discord as external account provider
  - Added `DISCORD` to `ExternalAccountProvider` enum with database migration
  - Implemented `DiscordStrategy` with Discord OAuth2 flow and user profile fetching
  - Added `DiscordOAuthController` with endpoints (`GET /auth/discord` and `GET /auth/discord/callback`)
  - Support for both modern (@username) and legacy (username#1234) Discord username formats
  - Uses Discord API v10 `/users/@me` endpoint with `identify` scope
  - Follows same OAuth security pattern as DeviantArt (JWT state parameter, 10min expiration)
- **Orphaned Characters and Items System (#125)**: Allow creation of entities without immediate owner assignment
  - Added `isOrphaned` computed field to Character entity for ownership status tracking
  - Added community-specific `canCreateOrphanedCharacter` permission to Role model
  - Modified character and item creation to support optional owner assignment
  - Enhanced GraphQL schema with orphaned entity support
  - Database migrations grant orphaned character creation permission to Admin and Moderator roles by default
- **Pending Ownership System (#125)**: Automatic ownership claiming via external account linking
  - New `PendingOwnershipModule` with GraphQL API for managing ownership claims
  - Automatic claiming when users link external accounts (DeviantArt, Discord)
  - `displayIdentifier` field for privacy-friendly display of pending owner information
  - Field-level authorization protecting sensitive pending ownership data
  - `claimAllForAccount` mutation for batch claiming characters/items
  - Database schema with `PendingOwnership` table linking to external accounts
- **Discord Bot Integration (#125)**: Discord username resolution and guild linking
  - Added `DiscordModule` with Discord.js bot integration
  - Community Discord guild linking via guild ID configuration
  - Automatic Discord username resolution from user IDs for pending ownership display
  - Bot requires `VIEW_CHANNEL` permission for username lookups
  - `discordGuildInfo` query returning guild name and member count
  - Added `DISCORD_BOT_TOKEN` environment variable to deployment pipeline

### Fixed

- **Discord Bot Memory Leak (#125)**: Fixed memory leak by limiting Discord member fetch results to 50 members with query-based filtering
- **Discord Initialization (#125)**: Properly reject promises on bot initialization errors instead of silent failures
- **Pending Ownership Race Condition (#125)**: Eliminated race condition in `claimAllForAccount` by using proper transaction handling
- **Orphaned Character Permissions (#125)**: Fixed critical permission bugs in `CharacterEditGuard` preventing proper orphaned character editing authorization
- **Nested DTO Validation (#125)**: Added `@ValidateNested()` and `@Type()` decorators to pending owner fields for proper validation
- **Discord User Validation (#125)**: Added validation to ensure numeric Discord user IDs exist before creating pending ownership records

## [v4.2.0] - 2025-10-28

### Added

- **Community Color Palette System**: Community-level color management and entity color assignment
  - New `CommunityColor` model with GraphQL CRUD operations
  - Color support for Traits, SpeciesVariants, EnumValues, and ItemTypes
  - Field resolvers for color relationships across all entity types
  - `CommunityColorsService` with community validation logic
  - Database schema migrations for color system tables and foreign keys

### Changed

- **Entity Services**: Updated create/update methods to validate color assignments
  - `TraitsService`: Validates trait colors belong to species community
  - `SpeciesVariantsService`: Validates variant colors belong to species community
  - `EnumValuesService`: Validates enum value colors belong to trait's species community
  - `ItemTypesService`: Validates item type colors belong to item type community

### Security

- **Community Color Permissions**: Enforced `CanEditSpecies` permission for all community color operations
  - Added `communityColorId` resolution to auth system
  - Color create/update/delete now require community membership with proper permissions
  - Extended `CommunityResolverService` with `getCommunityColorCommunity()` method

## [v4.1.0] - 2025-10-27

### Added

- **Character Trait Value Field Resolvers**: Added GraphQL field resolvers for trait metadata and enum value names on CharacterTraitValue to enable rich trait display

## [v4.0.1] - 2025-10-26

### Fixed

- **Enum Trait Default Display Value (#116)**: Fixed `resolveDefaultDisplayValue` field resolver returning null for ENUM type traits instead of returning the default value from `defaultValueString` field

## [v4.0.0] - 2025-10-26

### Added

- **Trait Ordering System (#105)**: Custom trait display order management for species variants
  - Added `updateTraitOrders` mutation for batch updating trait display order in species variants
  - Extended `traitsBySpecies` query with optional `variantId` parameter for variant-specific trait ordering
  - Traits ordered by `TraitListEntry.order` field (ascending) with alphabetical tiebreaker by trait name
  - When no variant specified, traits default to alphabetical ordering by name
  - Enables species admins to control trait display order in character forms per variant
- **Character Species Assignment Validation (#101)**: Prevent species changes once assigned to maintain data integrity and protect trait data
- **Character Details Field (#109)**: Added unified markdown `details` field (15,000 char max) to replace separate description/personality/backstory fields

### Changed

- **Dependencies (#98)**: Upgraded Apollo Server to v5 and NestJS to v11/v13 for improved field-level authorization support
- **Character Text Fields (#109)**: BREAKING - Removed `description`, `personality`, and `backstory` fields in favor of unified markdown `details` field

### Fixed

- **Email Exposure (#98)**: Sensitive user fields (email) now return empty values instead of errors when accessed by unauthorized users using field-level authorization with sentinel values

- **Character Trait DTO Validation (#101)**: Fixed ValidationPipe error when updating character traits by adding missing `@Type` decorator and `@IsString()` validator
- **DeviantArt OAuth Redirect (#100)**: Fixed deployment script to use proper frontend domain instead of backend IP address for FRONTEND_URL environment variable, resolving OAuth redirect failures.
- **Species Deletion with Characters (#86)**: Prevent deletion of species when characters are using them. The species `removeSpecies` mutation now validates that no characters exist for the species before allowing deletion. Returns a user-friendly error message indicating how many characters are affected and suggesting to delete or reassign them first. This prevents data integrity issues and accidental orphaning of characters.
- **Media Query with Private Characters (#90)**: Fixed GraphQL error when querying media associated with private characters/galleries. Character and gallery field resolvers now pass current user context and gracefully return `null` for inaccessible private entities instead of failing the entire query. This allows PUBLIC media to display even when associated character/gallery is PRIVATE. Thanks @Owlscape!
- **Image Upload Crash (#89)**: Fixed SelfGuard crashing on REST endpoints like image upload. SelfGuard now gracefully handles non-GraphQL contexts instead of attempting to access undefined GraphQL arguments. Thanks @Owlscape!

## [v3.0.0] - 2025-10-19

### Added

- **Community Members Search (#43)**: Added searchable community members field resolver
  - Added `Community.members` field resolver with search filtering and limit parameters
  - Added `getMembers` service method with case-insensitive username and displayName search
  - Supports efficient member lookup with max 20 results and alphabetical ordering
  - Enables performant user typeahead functionality in frontend
- **Community Item System (#43)**: Complete inventory management with items and item types
  - Added `ItemType` entity for defining reusable items within communities (name, description, category, stackable, tradeable, consumable properties)
  - Added `Item` entity for user-owned item instances with automatic stacking logic and quantity tracking
  - Added community permissions: `CanManageItems` (create/edit item types), `CanGrantItems` (grant items to users)
  - Added GraphQL API with proper graph design:
    - `User.inventories(communityId)` field resolver returning conceptual Inventory objects
    - `Inventory` type (not database-backed) providing community-scoped item grouping
    - Item type CRUD operations: `itemTypes`, `itemType`, `createItemType`, `updateItemType`, `deleteItemType`
    - Item granting: `grantItem` mutation with automatic stacking and community membership validation
  - Database migration grants item permissions to existing Admin and Moderator roles
  - JSON metadata support for both ItemType and Item using GraphQLJSON scalar
  - Circular dependency handling between UsersModule and ItemsModule using forwardRef
- **DeviantArt OAuth 2.0 Integration (#62, #73)**: Complete external account linking system
  - Added `DeviantArtOAuthController` with OAuth flow endpoints (`GET /auth/deviantart` and `GET /auth/deviantart/callback`)
  - Added `ExternalAccountsModule` and `ExternalAccountsService` for managing linked social accounts
  - Added GraphQL API for external accounts:
    - `myExternalAccounts` query to retrieve all linked accounts for current user
    - `unlinkExternalAccount` mutation to remove account linkage
  - Added `ExternalAccount` Prisma model with support for multiple providers (DEVIANTART)
  - OAuth flow uses JWT-based state parameter for CSRF protection and user identification
- Added Terraform configuration for DeviantArt OAuth credentials with environment-specific deployment support

### Security

- **OAuth Security Improvements (#62, #73)**: Multiple security enhancements to OAuth implementation
  - Separated OAuth state JWT secret from main JWT secret (`JWT_SECRET + "_O"`) to prevent token confusion attacks
  - Moved authentication from URL query parameters to Authorization headers in OAuth initiation flow
  - Fixed critical vulnerability where OAuth callback trusted URL state parameter without proper verification
  - Added JWT-based state parameter validation with 10-minute expiration for OAuth flows
  - Implemented proper state parameter verification in callback to prevent CSRF attacks

## [v2.0.1] - 2025-09-02

### Fixed

#### Invite Code System

- **Invite Code Reuse Bug (#55)**: Fixed issue where invite codes could be reused despite throwing errors
  - Root cause: Invite code claiming was not atomic - claim count incremented before membership creation, allowing reuse on failure
  - Solution: Wrapped both claim count increment and membership creation in single database transaction
  - Added user-friendly error handling for duplicate membership attempts with "You are already a member of this community" message
  - Applied fixes to both direct invite code claims (`invite-codes.service.ts`) and signup flow (`auth.service.ts`)
  - Thanks to Neo for reporting this issue
  - Verified fix prevents usage count inflation and provides proper error messages to users

## [v2.0.0] - 2025-09-01

### Added

#### Core Entity Management Backend Support

- **Enhanced GraphQL Schema**: Extended schema with comprehensive entity management operations
  - Species and SpeciesVariant resolvers with CRUD operations and relationship support
  - Trait management resolvers supporting ENUM, STRING, INTEGER, and TIMESTAMP value types
  - EnumValue and EnumValueSetting resolvers for trait configuration management
  - Community and invite code management with role-based permission integration
- **Database Schema Updates**: Enhanced entity relationships and permission system
  - Added `canEditOwnCharacter` permission field to Role entity for granular character editing control
  - Updated foreign key relationships for comprehensive entity management support
  - Improved cascade deletion rules for data integrity across entity hierarchies

#### Database Schema Expansion

- **Community System Entities**:
  - `Community` model for organizing users into distinct communities
  - `Role` model with community-scoped permissions (canCreateSpecies, canCreateCharacter, canEditCharacter, canEditSpecies, canCreateInviteCode, canListInviteCodes, canCreateRole, canEditRole)
  - `CommunityMember` junction table linking users to roles within communities
  - `CommunityInvitation` system for role-based community invitations with accept/decline tracking
  - `InviteCode` model supporting multi-use invite codes with claim limits
- **Species and Trait System**:
  - `Species` model with community ownership and image support flags
  - `Trait` model supporting multiple value types (STRING, TIMESTAMP, INTEGER, ENUM)
  - `EnumValue` model for trait enum options with ordering support
  - `SpeciesVariant` model for species sub-types
  - `TraitListEntry` model defining trait requirements and defaults per species variant
  - `EnumValueSetting` model configuring available enum values per species variant
  - `TraitValueType` enum defining supported trait value types
- **Character System Enhancements**:
  - `CharacterOwnershipChange` entity for tracking character ownership transfers
  - Character model migration from text `species` field to relational `speciesId` and `speciesVariantId`
  - JSON `traitValues` field on Character with GIN index for efficient querying
- **User System Enhancements**:
  - Global permission fields: `canCreateCommunity`, `canListUsers`, `canListInviteCodes`, `canCreateInviteCode`, `canGrantGlobalPermissions`
  - Community relationship fields for membership, invitation, and invite code management
  - Character ownership change tracking relationships

#### GraphQL Schema and Service Layer

- Field resolvers for `MediaConnection` entity adding `imageCount` and `textCount` computed fields
- Prisma JSON types generator integration for proper TypeScript support of JSON fields
- Service layer refactoring to eliminate GraphQL type dependencies
- Field resolver pattern implementation for all entity relationship resolution
- E2E testing agent specification for automated regression testing

#### Database Performance Optimizations

- Parallel database queries in media service for efficient type counting
- GIN index on Character.traitValues for fast JSON field queries
- Unique constraints on community/role relationships to prevent duplicates

### Fixed

#### Media System Issues

- **Media Type Counting Bug (#12)**: Fixed incorrect media type counts in character gallery filter buttons
  - Root cause: Filter counts were calculated from already-filtered results instead of total dataset
  - Solution: Separate GraphQL queries for display filtering vs. total counts, backend field resolvers for efficient counting
  - TypeScript improvements: Replaced `any` types with proper `MediaGridItem` interface using deep Pick types
- **GraphQL Validation Error**: Fixed validation failure when querying media with `limit: 0`
  - Changed minimum limit validation from 1 to allow count-only queries
  - Updated frontend to use `limit: 1` for count queries to satisfy validation
- **Character Media Gallery Filter Visibility**: Filter buttons now remain visible when no content exists for selected filter type

#### Service Layer Architecture

- Decoupled service methods from GraphQL types to improve testability and maintainability
- Moved entity relationship fetching from service layer to GraphQL field resolvers
- Fixed circular dependency issues in service imports

### Changed

#### Breaking Changes

- **Character Species Field**: Removed text `species` field from Character model
  - Existing character species data will be lost during migration
  - Replaced with relational `speciesId` and `speciesVariantId` foreign keys
  - Characters now require species to be defined through Community→Species relationship

#### Architecture Improvements

- **Service Layer Refactoring**: Complete separation of business logic from GraphQL presentation layer
  - Services now return Prisma entities instead of GraphQL types
  - Entity relationship resolution moved to dedicated field resolvers
  - Improved unit testability by removing GraphQL dependencies from business logic
- **Media Service Optimization**: Implemented parallel database queries for media type counting
  - Single service call now efficiently calculates total, image, and text counts
  - Reduced database round trips from 3 separate queries to 1 parallel execution
- **GraphQL Field Resolution Strategy**: Adopted field resolver pattern for all entity relationships
  - Eliminates N+1 query potential (though dataloader implementation still needed)
  - Provides more granular control over data fetching per GraphQL field
  - Enables better caching strategies at the field level

#### Database Schema Updates

- Enhanced User model with comprehensive permission and relationship fields
- Character model now supports dynamic trait system through JSON field storage
- Added comprehensive foreign key relationships for community hierarchy
- Updated Prisma schema with proper cascade deletion rules for data integrity

### Performance Impact

- **Expected Performance Degradation**: Field resolver pattern may introduce N+1 queries until dataloader patterns are implemented
- **Optimization Opportunities**: Media type counting now uses efficient parallel queries, reducing response time for character gallery pages
- **Database Indexing**: Added GIN index on Character.traitValues for fast JSON queries

### Tests

- `items.service.spec.ts` (17) and `item-transactions.service.spec.ts` (15): per-instance granting, the absence of any stack read, soft revoke, cross-type and cross-owner revoke refusals, staff notes excluded from search, batch-size reporting on a partial page, and ledger rows written through the caller's transaction client rather than the pool.

### Migration Notes

- Database migration required for schema changes
- Existing character species data will be lost (breaking change)
- Communities and species must be created before characters can reference them
- User permission fields default to false, requiring explicit permission grants

### Development Experience

- Enhanced TypeScript support with Prisma JSON types generator
- Improved error handling and validation in media queries
- Better separation of concerns between service and presentation layers
- Comprehensive test coverage for new entity relationships

## [v1.1.0] - 2025-08-12

### Added

- Enhanced media service deletion with automatic file cleanup for images
- Support for cleaning up image files from S3, local filesystem, and base64 storage
- Proper error handling for file cleanup operations (non-blocking)

### Fixed

- Media deletion now properly cleans up associated image files
- Image file orphaning when media is deleted

## [v1.0.0] - 2025-01-12

### Added

- Case-insensitive tag matching system with canonical display name preservation
- `displayName` field to Tag model for preserving user-entered tag casing
- Centralized tag creation logic in TagsService with `findOrCreateTags()` method
- Proper case-insensitive tag queries using `mode: 'insensitive'` in database operations

### Fixed

- Character service to properly handle new tag relationship system
- Character creation and update methods to use TagsService for tag operations
- Tag duplicate prevention across different case variations (e.g., "Fantasy", "FANTASY", "fantasy")
- Legacy `tags String[]` field usage in character operations

### Changed

- Tag matching now case-insensitive while preserving canonical display names
- Character-tag relationships now managed through dedicated CharacterTag junction table
- Tag creation process now centralized through TagsService

## [v0.2.0] - 2025-01-12

### Added

- New `TagsModule` with resolver and service for tag management
- `searchTags` GraphQL query for real-time tag search functionality
- Tag search API with popular suggestions and filtered results
- Database queries for tag relationships with usage count sorting
- Support for tag search with case-insensitive filtering

### Changed

- Enhanced GraphQL schema with tag search capabilities
- Updated app module to include TagsModule

## [v0.0.2] - 2025-08-10

### Changed

- No backend-specific changes in this release

## [v0.0.1] - 2025-08-10

### Added

- GraphQL API with character, gallery, and media management
- User authentication and authorization system
- Polymorphic media system supporting images and text content
- Social features including likes, follows, and comments
- Database integration with PostgreSQL
- File upload and media storage capabilities
- Health check endpoints
- Comprehensive test coverage
- OpenTelemetry tracing integration

### Fixed

- Private character access validation for owners
- Media upload and viewing functionality
- Apollo cache invalidation for create mutations
