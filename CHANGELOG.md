# Changelog

All notable changes to TraQuity are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Fixed a bug where a security name containing characters like `( ) [ ] + * ? | ^ $ \ { }` could not be selected in the *Add Transaction*
  dialog.
- Fixed a bug where a security's price chart silently kept its old contents when the prices of a newly picked data range or currency could
  not be loaded. The chart now selects the range and currency it was showing before, and an error notification states that the historical
  prices could not be loaded.

## [1.2.0] - 2026-09-20

### Added

- An `AI` section in the settings for downloading and configuring local LLMs to enable AI-driven features.
- **Import PDF** in the *Add Transaction* dialog: AI-driven feature for importing transactions from PDF files.

### Changed

- A new, consistent design across the whole app.
- The side menu starts out open on the first run of the app.
- Dependency updates.

## [1.1.1] - 2026-08-22

### Changed

- Dependency updates.

## [1.1.0] - 2026-08-18

### Added

- The About dialog now has a `Transparency` tab naming every third-party server the app contacts, when it does so and what the request
  carries. Its `ⓘ` button is now available on the unlock and configuration screens as well, so the note can be read before a database is
  opened.

### Fixed

- The app no longer contacts a third party to fetch a font.

## [1.0.0] - 2026-08-17

### Added

- Initial public release of TraQuity.

