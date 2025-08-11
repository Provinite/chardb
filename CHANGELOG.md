# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Advanced tag editing UI with typeahead functionality and tag chips
- New `TagInput` component with integrated chip display and remove buttons
- Real-time tag search API with `searchTags` GraphQL query
- Tag suggestions based on existing popular tags
- Keyboard navigation support (Enter, Backspace, Arrow keys, Escape)
- Debounced search API calls for improved performance
- Tag chip visual design with remove buttons (X) integrated into input field

### Changed
- Replaced comma-separated tag input with modern chip-based interface
- Enhanced tag discoverability with typeahead search functionality
- Improved character creation and editing forms with better tag UX
- Updated form validation to handle tags as arrays instead of comma-separated strings

### Fixed
- Styled-components DOM prop warnings in TagInput component
- Proper focus management and accessibility in tag input interface

### Technical
- Added new `TagsModule`, `TagsResolver`, and `TagsService` to backend
- Created `useTagSearch` hook for managing tag search state
- Updated GraphQL schema with tag search capabilities
- Enhanced UI package with reusable TagInput component

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