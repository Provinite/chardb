# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v9.0.0] - 2026-02-09

## [v8.2.0] - 2026-02-09

## [v8.1.1] - 2026-02-08

## [v8.1.0] - 2026-02-08

## [v8.0.0] - 2026-02-01

### Added

- **Community Character List Page**: New dedicated character browsing page for communities
  - Route: `/communities/:communityId/characters` with automatic community sidebar integration
- **Item Type Detail Page**: Dedicated page for viewing item type details
  - Display item type information, description, and metadata
  - Links from admin item management and user inventory pages

### Changed

- **Character List UI Improvements**: Streamlined search and filtering interface
  - Removed species dropdown from basic search
  - Removed Gender and Species filters from advanced search
  - Removed visibility filter selector UI

### Fixed

- **Community Page Access**: Allow unauthenticated users to view community landing pages
- **Terraform Script Performance**: Optimize terraform outputs script with single JSON call instead of multiple invocations

## [v7.0.0] - 2025-11-13

## [v6.1.0] - 2025-11-06

## [v6.0.0] - 2025-11-03

## [v5.0.1] - 2025-11-02

### Fixed

- **Discord Guild Validation (#133)**: Fixed backend `validateDiscordGuild` query configuration issue

## [v5.0.0] - 2025-11-02

## [v4.2.0] - 2025-10-28

### Added

- **Community Color Palette System**: Community administrators can now create custom color palettes and assign colors to species entities for visual organization and branding
  - Colors can be assigned to Traits, Species Variants, Enum Values, and Item Types
  - Visual color pip indicators displayed throughout the application
  - Backend validation ensures colors can only be assigned within the same community
  - Database schema includes new `CommunityColor` table with proper foreign key relationships

## [v4.0.0] - 2025-10-26

### Changed

- **Character Text Fields (#109)**: BREAKING - Database migration removes `description`, `personality`, and `backstory` columns from characters table. All character details now use unified markdown `details` field with 15,000 character limit.

## [v3.0.0] - 2025-10-19

### Added

- **Community Item System** (#43): Virtual item management for communities
  - Community administrators can create item types and grant items to members
  - Users can view their community inventories with automatic item stacking
  - Support for stackable, tradeable, and consumable items with custom metadata
- **DeviantArt Account Linking** (#62): OAuth-based external account linking system
  - Link DeviantArt accounts to CloverCoin user profiles for ownership verification
  - Secure OAuth 2.0 Authorization Code flow implementation
  - Connected Accounts section in Edit Profile page
  - Backend external accounts module with GraphQL API
  - Database support for multiple external account providers (extensible for future platforms)
  - Automatic callback handling and account verification

## [v2.0.0] - 2025-09-01

### Added

- **UI Core Entity Management System**: Comprehensive administration interface for species, traits, and community management
  - Species management pages with creation, editing, and variant support
  - Trait builder system supporting ENUM, STRING, INTEGER, and TIMESTAMP value types
  - Community administration with role-based permissions and invite code management
  - Enum value configuration interface for species variant customization
  - Enhanced UI component library with Card, Modal, Input, Typography, and ErrorMessage components
- **Permission Management System**: Advanced role and permission administration interface
  - Visual permission matrix for comprehensive permission overview
  - Role editor with template support and granular permission control
  - Community member management with role assignment capabilities
  - Integrated permission management across all administrative interfaces
- Core entity migration from clovercoin-app including community system, species/trait management, and character ownership tracking
- Backend service layer refactoring to decouple from GraphQL types with field resolver patterns
- E2E testing agent specification for automated regression testing workflows

### Fixed

- Media type filter button visibility issues on character pages

### Changed

- Characters now use relational species instead of text field (breaking change)
- Enhanced Button component with improved styling and variant support

## [v1.1.3] - 2025-08-12

### Fixed

- Fix Discord notification script not firing

## [v1.1.2] - 2025-08-12

### Fixed

- Fix Discord notification script formatting issues with version headers and section formatting

## [v1.1.1] - 2025-08-12

### Changed

- Improve notify-release script to use jq for safer JSON payload creation

## [v1.1.0] - 2025-08-12

### Added

- Delete functionality for characters and media content

## [v1.0.0] - 2025-01-12

### Added

- Database migration to add `displayName` field to tags table
- Case-insensitive tag system to prevent duplicate tags with different cases

### Changed

- Eliminated legacy `tags String[]` field in favor of proper tag relationships

## [v0.2.0] - 2025-01-12

### Added

- Enhanced tag editing system with typeahead functionality and improved UX

## [v0.1.0] - 2025-01-11

### Added

- Tag editing functionality for characters after creation
- Reusable Tag and TagsContainer components with variant support
- Tag display in character lists (first 3 tags + overflow indicator)
- Tag display in character detail pages (all tags in dedicated section)
- Support for custom tag colors from backend
- Hover effects and accessibility features for tag components

### Fixed

- Missing tag editing capability in character edit form
- Inconsistent tag display across the application

### Changed

- Enhanced character edit form with Tags section matching create form styling
- Character detail page now supports both complex tag objects and simple tag arrays

## [v0.0.2] - 2025-08-10

### Added

- Discord release notification system for automated changelog updates
- GitHub Actions workflow for tag-triggered notifications
- CI scripts directory for deployment and notification automation

### Fixed

- Discord webhook JSON formatting and message rendering
- Proper newline handling in notification messages

## [v0.0.1] - 2025-08-10

### Added

- Initial release of CharDB platform
- Monorepo structure with backend and frontend applications
- CI/CD infrastructure setup
- Project documentation and deployment guides
- Changelog system for release tracking
