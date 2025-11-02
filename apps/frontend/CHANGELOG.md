# Frontend Changelog

All notable changes to the frontend application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- **UI Component Library Enhancement (#125)**: Added reusable form components
  - `RadioGroup` component for radio button groups with label support
  - `Alert` component for informational messages with variant support (info, warning, error, success)

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

### Changed

- Enhanced character edit form with Tags section matching create form styling
- Character detail page now supports both `tags_rel` (complex objects) and `tags` (simple arrays)
- Improved tag processing with comma-separated string to array conversion

## [v0.0.2] - 2025-08-10

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

### Changed

- Updated navigation from "Images" to "Media" for unified content support
- Simplified character media upload experience
- Enhanced media editing with artist metadata fields
