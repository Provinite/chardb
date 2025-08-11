# Backend Changelog

All notable changes to the backend application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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