# Changelog

All notable changes to TraQuity are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Failing exchange rate downloads (e.g. due to having no internet connection) no longer crashes the app.
- Transactions are guaranteed to have a minimum share count greater than zero at all times. This prevents unexpected behavior throughout the
  app.
- *Depot / Positions* loads with several depots selected when the buy-ins of their positions add up to zero, e.g. for shares received for
  free.
- *Depot / Dividends* loads when a security paying regular dividends has a value of zero, e.g. shares received for free with no known
  price.
- Relative performance and dividend yields show ∞ when only their basis is zero, e.g. the buy-in of shares received for free, and 0% when
  both values are zero.
- A purchase lot no longer shows a CAGR of -100% when bought today or later. Its CAGR shows +∞ when it grew out of a buy-in of zero, and `–`
  where none can be computed: bought today or later, a buy-in of zero without value, or a security without any price.
- Relative performance in *Depot / Performance* and in a position's performance breakdown shows when the invested capital or cost basis
  is negative, e.g. after tax refunds exceeding the buys.
- *Depot / Performance* loads when all transactions of the selected depots are dated after today, e.g. a buy entered ahead of time.
- *Depot / Dividends* loads when taxes and fees take the whole gross value of a year, quarter or month, e.g. a single dividend taxed in
  full.

## [1.5.0] - 2026-11-08

### Added

- `BUY` and `SELL` transactions now fill in historical security prices for the securities where no data source is configured or the data
  source does not provide data for the given date. This enables complete passive tracking of depot value for regular investments such as
  savings plans.

### Changed

- The preconfigured **Divvy Diary** data sources in *Settings / Historical Security Prices* and *Settings / Dividend Announcements* now
  use the ISIN to identify a security instead of relying on manually configuring the ISIN a second time. Manually configured data sources
  also support this feature when replacing `#id()` with `#id(isin)` in their URL(s) and headers.

## [1.4.5] - 2026-11-07

### Changed

- Dependency updates.

### Fixed

- Minor UI issues.

## [1.4.4] - 2026-11-01

### Changed

- Dependency updates.

### Fixed

- The *Fixed Interest (Regular Investments)* benchmark on the *Depots / Performance* tab no longer invests an installment for the
  calendar month before the shown date range. Every month from the first to the last shown day is now invested exactly once.

## [1.4.3] - 2026-10-31

### Changed

- Dependency updates.

## [1.4.2] - 2026-10-24

### Changed

- Dependency updates.

## [1.4.1] - 2026-10-24

### Changed

- Dependency updates.

## [1.4.0] - 2026-10-18

### Added

- A **Performance Breakdown** over the whole transaction history, including shares already sold. It shows buys, sells, dividends, taxes and
  fees summing to net cash flow, which together with current value sums to the Total return, its percentage and the cost basis. It is
  available for a single position on the new **Performance Breakdown** tab of the position details dialog, for a position group by clicking
  the group's label in the *Depots / Positions* list or its arc in the allocation chart, and for the whole depot selection by clicking the
  total above the list or the center of the allocation chart.
- Clicking a slice of the allocation chart on the *Depots / Positions* tab opens that position's details dialog, just like clicking its
  line in the position list does.
- **Divvy Diary** is now a preconfigured data source in both *Settings / Historical Security Prices* and *Settings / Dividend
  Announcements*. Like the other preconfigured sources it needs nothing but your personal API key, and it contacts
  Divvy Diary only once that key is saved and a security is configured against it. Creating an API key and using it according to the
  applicable Terms of Service remains your responsibility.

### Changed

- Dependency updates.
- Minor UI improvements.

### Fixed

- The *Cash position* caption on the *Depots / Performance* tab no longer renders `Infinity` for a depot holding only cash with
  `Add cash to absolute value` enabled, and now relates the cash position to the same depot value shown in the *Absolute depot value*
  tile beside it.

## [1.3.0] - 2026-10-11

### Added

- **Import Transactions** on the *Depots / Transactions* tab is now a menu with `CSV` and `PDF`: `PDF` opens a wizard that imports a whole
  folder of broker PDFs (subfolders included) in one run, creating the securities and transactions it finds.
- **Sell Simulation** on the *Depots / Position List* view. When clicking on a position, next to the lots there is a simulation that
  provides an estimate on what you may receive when selling a given amount of shares at the given conditions. It also calculates the taxable
  gain which can support you in crafting a transaction for using available tax credits.
- **Lots view** now displays the buy-in value of the lot and, if applicable, the cost basis. Cost basis is buy-in + fees and taxes.
- Both the CSV and the PDF folder import wizard now apply the security's recorded stock splits to the imported quantity, filling *Quantity (
  split-adjusted)* automatically.

### Changed

- Dependency updates.
- Minor UI improvements.

## [1.2.4] - 2026-10-10

### Changed

- Dependency updates.

## [1.2.3] - 2026-10-04

### Changed

- Dependency updates.

## [1.2.2] - 2026-09-26

### Changed

- Dependency updates.

## [1.2.1] - 2026-09-24

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

