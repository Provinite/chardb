# CLI Changelog

All notable changes to the `yarn chardb` command-line tool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`yarn chardb`**: personal-access-token CLI with `whoami`, `communities get`, `users get`, `items types`, `items grant`, `gql` and stored tokens; the token's prefix picks the API.
- **Bundled build**: committed `dist/chardb.mjs`, the package's `chardb` bin, starts in under a tenth of a second; `yarn workspace @chardb/cli build` regenerates it.
- **`whoami` site permissions**: prints the token's global permissions on a `site` row (#611).
