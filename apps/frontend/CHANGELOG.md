# Frontend Changelog

All notable changes to the frontend application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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