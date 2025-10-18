# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
