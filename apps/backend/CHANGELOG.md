# Backend Changelog

All notable changes to the backend application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
