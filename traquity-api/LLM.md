# LLM.md

Guidance for LLM coding agents (Claude Code, etc.) working in this package.

## What this package is

OpenAPI 3.0.3 specs — source of truth for the TraQuity HTTP API. Specs plus validation scripts, no runtime code.
`traquity-client-angular` and `traquity-server-spring` consume them as codegen input. Workflow: root `LLM.md`.

## Specs

- One YAML file per domain, each fully self-contained. No `$ref`s across files — common shapes (`Id`, `Version`, `Currency`,
  `SortOrder`) are redefined in every spec that needs them (ADR-008).
- `info.version` stays `1.0.0` always. Never bump it — the API versions with the app, the release tag is its version
  (ADR-006, ADR-013).
- Each spec declares its own `title`/`description` for the one domain it owns, and the same local dev `servers` entry
  (`http://localhost:23726`). No two specs share a title.

## Commands

- `npm run test` — validate every spec in one run.
- `npm run test:<domain>` — validate a single spec.
- `openapi-generator-cli` version is pinned in `openapitools.json`. Keep it in sync with
  `traquity-client-angular/openapitools.json` and the plugin version in `traquity-server-spring/pom.xml`.

## Editing conventions

- A change here has no effect until the frontend/backend regenerate — root `LLM.md`, "Making an API change".
- A new domain gets: a top-level `info`/`servers` block, tags matching the domain name, locally-defined `Id`/`Version` schemas, and
  a test script in `package.json`.
- An endpoint describing the running backend process (identity, mode, DB connection, build deps) belongs in `admin.yaml`, under
  `/admin` (ADR-011). Everything describing the portfolio, or config traveling with the DB file, belongs in a domain spec.
- `PUT` on a version-carrying resource declares a `409` ("Optimistic Lock failed"). `DELETE` never does.
- Never declare `500`. Any endpoint can fail unexpectedly regardless.
- A collection endpoint answers "there is nothing" with `200` and an empty array (`minItems: 0`), never `204`/`404`. `404` on a
  collection endpoint means a missing *parent*, not an empty result.
- Paginate a collection only where it grows in size unbounded and the client is not forced to bound the response (e.g. by required query
  parameters) (ADR-010) — `page`/`pageSize` query params plus a `Paginated<X>Read` wrapper. Everything else returns a bare array. Decide
  this when the endpoint is written; changing it later breaks the response type.
- A body that is one scalar is `text/plain` for a string, `application/json` otherwise (ADR-009).
- Every operation declares `401` and `403` (ADR-007), each a `$ref` into that spec's own `components/responses`
  (`Unauthorized`, `Forbidden`) — copy the two responses into a new spec, never reach into another file. Never declare `429`.
- Naming (ADR-005): kebab-case paths, including compound words (`/historical-prices`); scoped aggregates prefixed with what
  they aggregate over (`/depot-positions`); identifier query params named `<resource>Ids`; a quantity qualified as absolute/relative
  written quantity-first (`performanceAbsolute`); operation IDs `get*`/`create*`/`update*`/`delete*`, `set*` reserved for a `PUT` on
  a versionless value resource, never `is*` for a `GET`; schema names singular.
- A resource that can be created and updated gets the `Create`/`Update`/`Read` triple. `Update` is `Create` plus `version`, `Read`
  is `Update` plus identity. `Create` never carries `version`.
- Money, share counts, ratios: `type: number`, no `format`. `format` is only for genuinely integral values (`int64` for IDs,
  versions, day counts; `int32` for years/quarters/months/page numbers). Never `format: double` — it narrows the server's
  `BigDecimal` at the mapper boundary (ADR-001).
- `DELETE` answers `204` for an absent value resource, `404` for an absent entity (ADR-004). A missing parent is always `404`.
- Express optionality by omitting from `required`, never with `nullable: true`.
