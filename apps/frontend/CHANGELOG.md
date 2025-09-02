# Frontend Changelog

All notable changes to the frontend application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v2.0.0] - 2025-09-01

### Added

#### Community Invitation System
- **Community Join Functionality**: New `JoinCommunityPage` component for existing users to join communities via invite codes
  - Real-time invite code validation with GraphQL integration
  - Community preview showing name and assigned role before joining
  - Form validation using react-hook-form and zod schema validation
  - Success notifications and automatic navigation to joined community
- **Dashboard Integration**: Added "Join Community" quick action button to dashboard for easy access
- **Invite Code Testing Flow**: Complete end-to-end testing of community invitation system
  - Enter invite code → Real-time validation → Community preview → Join confirmation → Success redirect

#### UI Component Improvements  
- **Input Component Enhancement**: Fixed React ref forwarding and styled-components prop issues
  - Resolved "Function components cannot be given refs" console errors
  - Added transient props (`$hasError`) to prevent DOM warnings
  - Improved form integration with react-hook-form library
- **Error Feedback Components**: Enhanced form validation feedback system
  - Real-time validation status indicators (valid, invalid, loading states)
  - Community preview cards with role assignment information
  - Toast notifications for successful community joins

#### TypeScript Type Safety Improvements
- `MediaGridItem` interface using deep Pick utility types for minimal required media fields
- Proper TypeScript interfaces for nested GraphQL entity fields (`owner`, `image`, `textContent`)
- Enhanced type safety for media component props with strict typing
- Eliminated `any` type usage in media components to prevent runtime type errors

#### GraphQL Schema Integration
- Updated GraphQL queries to support new backend `imageCount` and `textCount` fields
- Enhanced `GET_CHARACTER_MEDIA` query with separate count field resolution
- Regenerated GraphQL TypeScript types with latest backend schema changes
- Added support for media type filtering with accurate count display

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