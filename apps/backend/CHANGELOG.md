# Backend Changelog

All notable changes to the backend application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

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
