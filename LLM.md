# LLM.md

Guidance for LLM coding agents (Claude Code, etc.) working in this repository.

## Repository overview

TraQuity is a portfolio-tracking desktop app. Monorepo, three parts:

- `traquity-api` — OpenAPI specs. Source of truth for every HTTP API. One YAML file per domain.
- `traquity-client-angular` — Angular + NgRx frontend, packaged as the Electron desktop app. Generates its API client from
  `traquity-api` into `src/gen/api/`.
- `traquity-server-spring` — Spring Boot backend implementing the same APIs.

Read the part's own `LLM.md` before changing anything there: `traquity-api/LLM.md`, `traquity-client-angular/LLM.md`,
`traquity-client-angular/electron/LLM.md`, `traquity-server-spring/LLM.md`.

## Code style

Line length: 140 characters, project-wide and in all file types. Language specifics live in each part's own `LLM.md`.

## Testing: nothing under test witnesses itself

- Never assert a result using the same unit under test. Act on the unit, then assert against something it did not produce: state it
  wrote, a collaborator it called, a response it returned.
- Arrange the same way: never set up fixture state via a service call or a `POST`. Use mocks, direct SQL/inserts, or hand-built
  literals.
- A part's own `LLM.md` may add a stricter version of this rule (e.g. Spring: never call an endpoint to arrange DB state for a test).

```js
// wrong — stateOf/verify are readers from the module under test
registry.recordProvenStart(databasePath, password);
expect(registry.stateOf(databasePath)).toBe('scrypt');

// right — assert the state it wrote
registry.recordProvenStart(databasePath, password);
expect(config.auth).toEqual({[databasePath]: {scrypt: {/* ... */}}});
```

## Assertion precision

- Never use a type-only check (`expect.any(String)`) where a concrete value is cheap to check. Assert the exact shape: decoded byte
  length, UUID, ISO date.
- Write a custom matcher when no built-in expresses the shape. Give it its own test once it carries real logic (regex, decode-and-compare).
- Never compare a value to itself through a shared mutable reference — capture the expected value independently, before the act.
- Keep an identity (`toBe`) check only when identity itself is part of the claim, as a second assertion alongside a content check.

## Domain separation beats DRY

- Domain separation wins over DRY.
- Never add server/service surface for a presentation concern (serialization, formatting, labeling) — that belongs to the presenting
  layer.
- Duplicate per-domain test data factories even when near-identical. Never couple one type's factory to another's to save lines.
- Within one domain, DRY as normal.

## Dependency inversion binds the docs too

- A comment documents the unit's own contract — never who calls it, in what order, or what a caller does with the result.
- Put caller-specific reasoning next to the call site, not in the callee's doc.
- A rule spanning tiers or screens belongs in the story's acceptance criteria and the relevant `LLM.md`.
- Test every such doc: does it stay true if every current caller is deleted? If not, rewrite it as a property of the unit's own
  contract.

## Documentation

Write in plain, direct, modern language. No pompous or pseudo-intellectual phrasing, no lecturing. Keep it concise and to the point.

Documentation (JavaDoc, JSDoc etc.) describes a class, method, function, interface, enum etc. Comments are prose attached to code.

Public methods and functions are to be documented. Others receive documentation if and only if the purpose of the unit is not
self-explanatory.

Comments must be used sparsely and only for non-obvious code or when reasoning why any of the given rules are broken.

Avoid mentioning stories and acceptance criteria in docs or comments.

## Outbound requests are disclosed in the app

- Every server contacted that this project does not run itself is listed in the About dialog's Transparency tab
  (`traquity-client-angular/src/app/privacy/privacy-notice/privacy-notice.component.html`): who, when, what.
- Keep it in sync when changing how the app interacts with third parties.

## Dependency licensing

- MIT project. Only add permissive-licensed dependencies: MIT, BSD, Apache-2.0, ISC, 0BSD, BlueOak-1.0.0, OFL-1.1 (fonts).
- Copyleft or source-available licenses (GPL/AGPL/LGPL, BSL, FSL, Commons Clause) need explicit confirmation first. Check the
  license before adding anything.
- Keep the shipped third-party license notice up to date with the actual dependency set — adding, removing, or bumping a
  dependency that changes its license updates the notice in the same change.

## How the pieces fit together at runtime

- Electron ships the product. The window opens on `ready` immediately.
- The Angular shell reads startup mode over an IPC bridge, then triggers backend start the same way.
- `configure` mode renders a screen for picking/creating the DB file and its password; finishing continues startup in the same window.
- The main process spawns the bundled Java process (`backend.jar`) as a child process.
- The DB password goes in as the first line of the child's stdin; closing that stream is the shutdown request.
- Backend listens on `23726` (H2 console `29232`), backed by a H2 DB. Path configurable via `TQ_DB_FILE_PATH`.
- Full boot order: `traquity-client-angular/electron/LLM.md`.
- `forge.config.js` copies the built Spring jar into `resources/backend.jar` during packaging. Run `mvn package` before any Electron
  package/make build.

## Making an API change

1. Edit/add the OpenAPI YAML in `traquity-api/`.
2. Regenerate the Angular client: `cd traquity-client-angular && npm run generate`.
3. Rebuild Spring: `cd traquity-server-spring && mvn generate-sources` (or `compile`/`package`).
4. Keep the `@openapitools/openapi-generator-cli` version in sync across both `package.json` files.
5. Keep both `openapitools.json` files and the Maven plugin version in sync when bumping.

New spec file — before step 2:

1. Add a test script to `traquity-api/package.json`, referenced from `scripts.test`.
2. Add a generator entry to `traquity-client-angular/openapitools.json`.
3. Add an execution for `openapi-generator-maven-plugin` in `traquity-server-spring/pom.xml`.

## Git

- Use `gh`/`git`. Read-only commands always fine. Writing to the local or remote git repository, issues, PRs etc. is prohibited.
- Create, edit, delete files in the working tree freely — that is the handoff; review happens via `git diff`.
- Never stage, commit, push, create/delete branches or tags, or touch PRs, issues, releases. The working tree is yours; the commit
  is mine.

### PR reviews

- Check source → target first.
  - `anything` → `next-release`: a feature, bug fix etc.
  - `next-release` → `main`: a release.
  - Anything else → `main`: flag it.
- Sanity-check a `next-release` → `main` PR:
  - Everything in `CHANGELOG.md`'s `[Unreleased]` is actually in the PR.
  - Nothing in the commits is missing from `[Unreleased]` (Bug/Feature/NFR issues belong there; issues tagged only "technical
    improvement" don't).
  - `LLM.md`/`README.md`/`USER_MANUAL.md` updated if needed.

## Drafting and reporting

- Larger output (plans, PR reviews) goes to `.scratchpad` as Markdown.
- Stories
  - one directory per story set
  - one file per story, using the templates in `.github/ISSUE_TEMPLATE/` (bug/feature/NFR)
  - write stories from a user's perspective only; don't include implementation details - these are part of separate implementation plans
- Multiple stories: add a meta file for ADRs, story map, shared context.

### Mockups

- A story adding or changing a screen gets a mockup in its directory, sharing the story's number prefix.
- One panel per state the ACs describe, each captioned with the ACs it shows.
- Colors/typography from `traquity-client-angular/src/styles.scss` — never invent a palette.
- Keep placeholder panels for sections a later story adds.

### Acceptance criteria

- One linear scenario per AC: `GIVEN` / `WHEN` / `THEN`, all three always present.
- No trigger: write `**WHEN:** -`. Keep the dash so "no trigger" reads as deliberate.
- Chain clauses with `AND` lines, each belonging to the block above it. Prefer several short `AND` lines over one comma-cramming
  sentence.
- No branching inside an AC. Split any "if it succeeded / if it failed" or alternative-outcome `AND` into its own AC: same `GIVEN`,
  different `WHEN`, `THEN` derived from exactly that.
- Same for a `GIVEN` offering alternative setups — split into two ACs. A parameterized clause covering equivalent inputs of one rule
  stays one AC; if the outcome differs per input, split it.
- Cover the unevaluable states of any "if and only if" gate with their own AC — e.g. a hash-comparison gate needs an AC for "no
  stored hash yet".
- `GIVEN` carries only preconditions the `THEN` depends on. Flip each clause — drop it if the outcome doesn't change.
- A story depending on a single-runtime environment names that precondition once in the description, repeated as a `GIVEN` clause in
  every AC that needs it.
- `WHEN` is observable at the moment it happens — never reconstructed from history.
- Bound negative assertions to the artifact the story controls (e.g. "no changes written to the config file" instead of "nothing is written
 to disk").
- An AC asserts outcomes only up to its own story's boundary. Where the scenario continues into another story's territory, name that
  story — never duplicate its contract. Refer to the story, never to specific ACs (renumbering breaks references).
- A story changing existing behavior gets ACs only for invariants its change could plausibly break — never a restatement of
  untouched behavior.
- Number ACs consecutively (`AC1`, `AC2`, …), each with a short title naming what the `THEN` asserts, not the intent. Name controls
  the way the UI labels them.
- Never use specific values (string examples, number examples etc.) when writing ACs. Use abstract placeholders and formulas.

```
**AC1: Correct password unlocks into the splash**
**GIVEN:** the unlock screen for a database with a stored hash for a `password`
**AND:** a backend that is not running yet
**WHEN:** the user enters the `password`
**AND:** confirms
**THEN:** the backend is started with that password
**AND:** the splash screen shows
```

```
**AC2: A sale the oldest lot covers takes its cost basis from that lot alone**
**GIVEN:** a position of a single security with lots `L1 … Ln`, `n >= 1`
**AND:** its opened `Sell Simulation` with `Fees Reduce the Taxable Gain` and `Buy Taxes Reduce the Taxable Gain` on
**WHEN:** the user enters `s <= c1` shares, a price of `p`, `t` tax-free gains, a tax rate of `r` and a fee of `f`
**THEN:** `Gross Value` shows `s × p`
**AND:** `Taxable Gain` shows `(s × p − f − ((b1 + f1 + x1) × (s ÷ c1))) × (1 − (t ÷ 100))`, so buy-in, buy fee and buy tax are all taken at
the share `s ÷ c1` of the lot
**AND:** `Taxes` show `max(0, Taxable Gain × (r ÷ 100))`
**AND:** `Net Value` shows `s × p − f − Taxes`
```
