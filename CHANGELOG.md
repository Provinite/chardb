# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Case-insensitive tag system with canonical display name preservation across the platform
- Database migration to add `displayName` field to tags table for preserving user-entered casing
- Enhanced tag management system to prevent duplicate tags with different cases

### Fixed
- Tag duplicate creation issues where "Fantasy", "FANTASY", and "fantasy" would create separate tags
- Character creation/editing failing when using new tag relationship system
- Inconsistent tag casing across the application

### Changed
- Tags are now matched case-insensitively while preserving the original user-entered casing for display
- Eliminated legacy `tags String[]` field in favor of proper tag relationships
- Centralized tag creation logic for consistent behavior across all tag operations

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