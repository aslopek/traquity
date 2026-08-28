# LLM.md

This file provides guidance to LLM coding agents (Claude Code, etc.) when working with code in this repository.

## Repository overview

TraQuity is a portfolio-tracking desktop app. This is a monorepo; three parts matter:

- **traquity-api** — OpenAPI 3 specs, the source of truth for every HTTP API. One YAML file per domain.
- **traquity-client-angular** — Angular + NgRx frontend, packaged as the Electron desktop app that ships to users. Generates its API
  client (`typescript-angular` generator) from `traquity-api` into `src/gen/api/`.
- **traquity-server-spring** — Spring Boot backend implementing the same APIs. Generates server-side delegate interfaces (`spring`
  generator) from `traquity-api` at build time into `target/generated-sources/openapi`.
- **openapigen/** ignore it - it's just the shared cache dir for the `openapi-generator-cli` jar (`storageDir` in both `openapitools.json`
  files).

See `traquity-api/LLM.md`, `traquity-client-angular/LLM.md`, `traquity-client-angular/electron/LLM.md` (the Electron main process) and
`traquity-server-spring/LLM.md` for details specific to each part.

## Code style

Line length is capped at 140 characters per line, project-wide (all three parts). Language-specific code styles are defined in the
respective `LLM.md` files.

## Testing: nothing under test witnesses itself

Frameworks, file layout and everything else about testing live in each part's own `LLM.md`. One rule spans all three parts, because it is
about what an assertion proves rather than about any framework:

**An assertion never obtains the value it checks through the code under test.** Act with the unit under test, then assert against something
that unit did not produce: the state it wrote, the collaborator it called, the response it returned. The moment a `THEN` calls back into the
same unit — a sibling method of the registry/store/service just exercised, a selector or computed belonging to the reducer or Signal Store
under test, a `GET` endpoint reading back what the `POST` under test wrote — the test stops showing that the behavior is right. It shows
that two parts of one implementation agree with each other, and they agree just as readily when both are wrong. Such a test also stops
localizing anything: one broken reader then fails every test of every writer.

```js
// wrong - `recordProvenStart` is confirmed by `stateOf` and `verify`, two readers out of the very module under test
registry.recordProvenStart(databasePath, password);
expect(registry.stateOf(databasePath)).toBe('scrypt');
expect(registry.verify(databasePath, password)).toBe(true);

// right - the config object it wrote into is inspected directly, and one assertion states what landed where
registry.recordProvenStart(databasePath, password);
expect(config.auth).toEqual({[databasePath]: {scrypt: {/* ... */}}});
```

Arranging is not exempt from this either — it is the same rationale, inverted. Using a service call or a `POST` to write fixture state into
the database is just as bad as using a `GET` or a service call to read it back out for the assertion: **one broken reader then fails every
test of every writer**, and one broken writer then fails every test that arranges through it. Arrange with mocks, direct SQL/inserts, or
hand-built JSON/literal objects instead of calling production code that shares implementation with the unit under test.

What the rule does not forbid:

- **Calling the unit is the act**, always. `stateOf` and `verify` above each get tests of their own, in which that call *is* the act and the
  arranged config is what the result is measured against — that is where they are covered, and it is why they need not be dragged into
  someone else's assertion.
- **Reading through a collaborator** the spec is not about: a different module, with its own spec, reached for because the plain state
  cannot carry the claim (a persisted hash whose salt is random needs `auth.js`'s `verifyPassword` to be tied back to its password). Prefer
  the plain state assertion, take this route only where the state alone cannot express what is claimed, and never route it back through the
  unit under test.

Where a part's `LLM.md` spells out a case of this, the specific rule stands alongside this one rather than replacing it — Spring's "never
call an endpoint to prepare database state for a test" is the arrange-side twin of it.

## Assertion precision

Two further traps make an assertion prove less than it looks like it does — neither is about *what* the assertion reads, like the rule
above, but about *how loosely* it reads it:

- **A type-only check where a value check is cheap.** `expect.any(String)` (or the AssertJ equivalent) passes for any string, including a
  wrong one. When the domain gives you a checkable shape — a base64 string decoding to an exact byte length, a UUID, an ISO date — assert
  that shape instead of just its type. Reach for a custom matcher (Jest's `AsymmetricMatcher`, an AssertJ `Condition`) when the built-in
  matchers can't express it, and give that matcher a spec of its own the moment it carries real logic (a regex, a decode-and-compare) rather
  than just wrapping a literal — test-only code is not exempt from "logic gets a test" just because nothing ships it. Where a part keeps
  reusable test infrastructure (`src/testing/` in the Angular client, `electron/testing/` in the Electron main process), a matcher used by
  more than one spec belongs there, colocated with the data factories.
- **Comparing a value to itself.** An "unchanged" assertion of the shape `expect(afterTheAct).toBe(theArrangedValue)` (or `.toEqual(...)`)
  proves nothing when `afterTheAct` and `theArrangedValue` are the same mutable object reference — a future implementation that mutates that
  object in place changes both sides identically, and the assertion stays green throughout. Capture an independent expected value *before*
  the act (a fresh literal, or a snapshot taken up front) and assert against that instead. Keeping `toBe` against the live reference
  alongside it still earns its place when identity itself is part of the claim ("no reassignment happened") — that and "the content is
  still correct" are two different questions, and asserting both takes two assertions.

## Domain separation beats DRY

When DRY and domain separation conflict, domain separation wins — in both directions:

- Breaking DRY (a new endpoint, service, or parallel implementation) is only justified when it carves out a genuine domain, never for a
  representation/presentation concern of data a tier already has. Serialization/formatting/labeling belongs to the tier that presents the
  data (usually the Angular client); prefer composing existing endpoints over adding server surface.
- Conversely, duplication that preserves domain separation is accepted. Example: test data factories stay one per type — a handwritten
  domain type and a generated API type each keep their own factory, even when the two are structurally near-identical. Don't couple them
  (e.g. by spreading one into the other) just to deduplicate their defaults.
- Within domains, DRY applies.

## Dependency inversion binds the docs too

Dependency inversion is a rule about knowledge, not merely about `import` statements — and a doc comment carries knowledge just as an
import does. A unit that must not depend on its callers must not *describe* them either: **a comment on a function, class, module or type
explains what that unit does, what its parameters and return value mean, and which invariants it upholds — never who calls it, in what
order, from which screen, or what a downstream consumer will later do with the result.** This holds in all three parts, for every comment
form (JSDoc, Javadoc, `//`), and it holds for callers the code has today just as much as for the ones a story happens to mention. A
test name falls under it too: it states what that test asserts on its own, never "the same way" as the test above it, which stops being
true the moment that neighbor is edited or deleted.

Naming the caller in prose is worse than importing it, because nothing checks it. The compiler catches a stale import; a comment claiming
"this runs on both finish buttons so the unlock screen's `OK` gates correctly" survives every rename, every new caller and the deletion of
that screen, and then actively misinforms the next reader. It also re-couples what the code took care to decouple: the module now cannot be
read, moved or reused without the reader believing they need the caller's context.

Where the knowledge is real, write it down where it belongs:

- **A reason a caller has for calling** belongs to the caller — put it there, next to the call, where it is about that caller's own
  behavior.
- **A rule spanning two screens or two tiers** belongs to the story's acceptance criteria, and to whichever `LLM.md` documents that seam,
  not to a helper that happens to sit on the path between them.
- **An invariant the unit itself upholds** is fair game and stays: express it as a property of the unit's own contract ("returns the
  selection re-read from the config, so a discarded `auth` entry reads as `pending`"), phrased so it is verifiable from the unit's own
  signature and body.

What this does not forbid: naming a *seam the unit itself owns* is part of its contract, not a caller reference — an IPC handler may name
the channel it serves, a delegate implementation the endpoint it fulfills, a preload script the bridge key it exposes. The test is whether
the statement stays true when every existing caller is deleted. If it does, it is the unit's contract; if it doesn't, it is a caller's
business.

## Documentation

When creating documentation (ADRs or any other Markdown files, JavaDoc, JSDoc, code comments etc.), write in a normal, direct, and modern
tone. Completely avoid pompous phrases, archaic sentence structures, rhetorical flourishes, and that preachy, textbook-like lecture tone.
Explain things short, crisp, and straight to the point.

## Outbound requests are disclosed in the app

The app tells the user, in the About dialog's `Transparency` tab, every server it contacts that this project does not run itself — who
receives the request, when it happens, and what it carries. That text is
`traquity-client-angular/src/app/privacy/privacy-notice/privacy-notice.component.html`, and it is a claim about the code in all three
parts: the renderer's update check, the Electron main process's JDK download, and the backend's exchange-rate and market-data fetches are
all listed there.

**A change that makes the app contact a recipient the notice does not name updates the notice in the same change**, in whichever part the
request lives. The same goes for a change to *when* an existing request happens (a poll where there was one request per start, say). A
recipient added to the code and not to the notice makes the notice false.

## Dependency licensing

This project is MIT-licensed. Only add a new dependency (npm or Maven, in any of the three parts) if its license is compatible with that —
permissive licenses (MIT, BSD, Apache-2.0, ISC, 0BSD, BlueOak-1.0.0, OFL-1.1 for fonts, etc.) are fine. Do not add a dependency under a
copyleft license (GPL/AGPL/LGPL) or a source-available/non-OSI license (e.g. BSL, FSL, Commons Clause) without explicitly flagging it and
getting confirmation first — check the dependency's own `package.json` `license` field (npm) or its POM's `<licenses>` block (Maven,
inherited from its parent POM if not set directly) before adding it.

## How the pieces fit together at runtime

The Electron app (`traquity-client-angular`) is the shipped product. `app.on('ready')` opens its single `BrowserWindow` on the built
Angular app immediately — it does not wait for Java to resolve, ask for a password or spawn the backend first. The Angular shell reads a
computed startup mode over an IPC bridge and, once past any unlock/configure screen, triggers the backend start itself via that same bridge.
In `configure` mode the shell renders the configuration screen, where the user picks or creates the database file and, for a newly created
one, defines its password; finishing there continues the very same startup flow in the same window, without a relaunch. `electron/main.js`
then spawns a bundled Java process running the Spring Boot backend (`backend.jar`) as a child process and reports back whether it became
reachable. The database password reaches that child over its stdin — the entire content of the stream, closed right after — rather than
through its environment. The backend listens on port `23726` (H2 console on `29232`), backed by a local encrypted H2 file database whose
path is configurable via `TQ_DB_FILE_PATH`. See `traquity-client-angular/electron/LLM.md` for the boot order in full.

`forge.config.js` copies `traquity-server-spring/target/traquity-server-spring-<version>.jar` into
`traquity-client-angular/resources/backend.jar` during electron-forge packaging — the Spring backend must be built (`mvn package`) before
an Electron package/make build.

## Making an API change (cross-cutting workflow)

1. Edit/add the relevant OpenAPI YAML in `traquity-api/`.
2. Regenerate the Angular client: `cd traquity-client-angular && npm run generate`.
3. Rebuild the Spring backend: `cd traquity-server-spring && mvn generate-sources` (or `compile`/`package`) — the
   `openapi-generator-maven-plugin` runs in the `generate-sources` phase and produces one delegate interface per domain (e.g.
   `DepotApiDelegate`), implemented by a package-private `*Controller`.
4. Keep the `@openapitools/openapi-generator-cli` version in sync across `traquity-api/package.json`'s devDependency and
   `traquity-client-angular/package.json`'s devDependency.
5. Keep `traquity-api/openapitools.json`, `traquity-client-angular/openapitools.json` and the plugin version in
   `traquity-server-spring/pom.xml` in sync when bumping.

Upon adding a new API spec file in step one, the following steps must be conducted before continuing to generate code:

1. Add a test script to `traquity-api/package.json` and reference the test script in `scripts.test`
2. Add a generator to `traquity-client-angular/openapitools.json`
3. Add an execution to plugin `org.openapitools.openapi-generator-maven-plugin` in `traquity-server-spring/pom.xml`

## Commands and per-part architecture

Commands (build, run, test) and architecture details for each part live in that part's own
`LLM.md` — read the one for the part you're working in before making changes there.

## Git

Use `gh` and `git` commands to interact with the GitHub repository.

Use of any read-only `git` or `gh` commands (e.g. `git status`, `git diff`, reviewing PRs) is permitted.

You may create, edit and delete files in the local working tree. That is how you hand work to me: I review it as a `git diff` before any of
it becomes a commit.

What you may never do is move anything out of the working tree and into the repository or onto GitHub. That includes, but is not limited to:
staging (`git add`), creating/amending commits, pushing, creating/deleting branches or tags, and creating, deleting or commenting on PRs,
issues and releases. Keep the most important rule in mind: anything going into this repository - code, text, PRs, issues etc. - is my
responsibility and fully owned by me. The working tree is yours to work in; the commit is mine, and I am the only one who makes it.

### PR reviews

When I ask you to do a PR review, first check source and target branch:

- Merging from `next-release` to `main` is done in preparation of a release.
- When a PR merges from any other branch to `main` you have to flag this to me, since the HEAD of `main` is supposed to always represent the
  latest release (what is bundled therein - documentation may update the HEAD without a release).
- You may assume that code on `next-release` has already been reviewed through other PRs, but a quick sanity check should include:
    - Is everything mentioned on `CHANGELOG.md`'s `[Unreleased]` Section actually contained in the PR?
    - Is anything missing in the `[Unreleased]` section, that's actually on the list of commits to be merged?
  - Bug/Feature/NFR issues are worth mentioning in the `CHANGELOG.md`. issues tagged only as `technical improvement` don't get
      mentioned.
    - Do any of the other Markdown files in this repository (e.g. `LLM.md` files, `README.md`, `USER_MANUAL.md`) have to be updated to
      reflect
      the changes to be merged?

## Drafting and Reporting

Larger output such as plans, PR reviews etc. go to the `.scratchpad` directory as Markdown files.

When I ask you to draft stories, you first create a directory in `.scratchpad`. Within this directory you put for every story a separate
file. Use the following files as templates:

- bugs: `.github/ISSUE_TEMPLATE/bug_report.md`
- features: `.github/ISSUE_TEMPLATE/feature_request.md`
- NFRs: `.github/ISSUE_TEMPLATE/non_functional_requirement_request.md`

If it makes sense to provide multiple stories, create a meta file in the directory. This may be turned into an epic and contain things like
architectural decision records (ADRs), story map and other useful information.

### Mockups

A story that adds or changes a screen gets a mockup in the story's directory, sharing the story's number prefix.

Draw one panel per state the ACs describe (empty, invalid, warning, error, populated, menu open …), caption each panel with the ACs it
shows, and take colors and typography from `traquity-client-angular/src/styles.scss` rather than inventing a palette. Panels that show
placeholders for sections a later story adds are worth keeping — they make the boundary between the stories visible.

### Acceptance criteria

An acceptance criterion describes **one linear scenario** in `GIVEN` / `WHEN` / `THEN` blocks. All three blocks are always present.

Not every AC has a trigger, though: when the `GIVEN` alone already establishes the state being asserted — a control that is simply
shown, a rendered result, an invariant such as "this string is in no file" — write `**WHEN:** -`. Keep the line with the dash rather
than dropping it, so a missing trigger reads as deliberate instead of forgotten. Name a `WHEN` whenever something actually happens: a
user action, a render pass, an app start, an IPC call, an incoming HTTP request or response, events etc..

Chain as many clauses per block as the scenario needs, using `AND` lines. An `AND` always belongs to the block above it — after `GIVEN`
it adds a precondition, after `WHEN` a further step of the trigger, after `THEN` a further assertion. Prefer several short `AND` lines
over one sentence cramming everything in with commas:

```
**AC3: Correct password unlocks into the splash**
**GIVEN:** the unlock screen for a database with a stored hash for password `secret`
**AND:** a backend that is not running yet
**WHEN:** the user enters `secret`
**AND:** confirms
**THEN:** the backend is started with that password
**AND:** the splash screen shows
```

What must **not** happen is branching inside an AC: no scenario may fork into "if it succeeded … / if it failed …", and no `AND` may
introduce an alternative outcome ("AND: entering a wrong password instead …", "AND: cancelling yields …", "AND WHEN: …"). Each branch
becomes its own AC — typically the same `GIVEN` setup with a different `WHEN`, and a `THEN` derived from exactly that:

- happy path: **GIVEN** a password-protected database … **WHEN** the correct password is provided … **THEN** it opens …
- unhappy path: **GIVEN** a password-protected database … **WHEN** a wrong password is provided … **THEN** the error appears …

The same goes for a `GIVEN` that offers alternative setups ("… or `null` with no `java` on the `PATH`") — two setups, two ACs. A
genuinely parameterized clause covering equivalent inputs of *one* rule stays a single AC (e.g. "WHEN it is renamed to `con`,
`foo:bar` or a name containing a path separator" → all rejected the same way). The `THEN` decides which case you have: if the outcome
differs per input, they are separate ACs, and a `THEN` naming two different follow-ups is the symptom of a merge that should not have
happened — "the configuration screen shows … AND the unlock screen does not ask again" describes two rules and reads as a contradiction.

A rule phrased as "if and only if" needs the states in which its condition cannot be evaluated covered by an AC of their own. "OK is
enabled if and only if the input matches the stored hash" silently means "never enabled" for a database that has no stored hash yet —
there is nothing to compare against. Whenever an AC gates a control or a transition on a comparison, ask which states lack the thing
being compared to, and give them their own AC.

A `GIVEN` carries only the preconditions the `THEN` actually depends on. Flip each clause: if the outcome stays the same, drop it.
Over-specified setups quietly exclude the paths that matter — "an app run that has not shown the splash screen yet" excludes every
retry, although a retry behaves identically.

Where a whole story depends on an environment that exists in only one runtime, name that precondition once in the description and then
repeat it as a `GIVEN` clause in every AC that needs it — e.g. "the startup bridge is available" for the `contextBridge` API the Electron
preload exposes. It survives the flip test precisely because the outcome without it is *unspecified* rather than the same, and stating it
per AC is what makes that deliberate: the other runtime then needs no ACs, and no code. A screen may well be openable under `ng serve` to
look at its layout without the story promising anything about what it does there.

A `WHEN` is an event observable at the moment it happens, not a condition reconstructed from history. "the spawned process exits" is
observable; "the spawned process exits without ever having become reachable" makes the implementation track a past that changes
nothing about the outcome.

A negative assertion names what it is about. "Nothing is written to the disk" is untestable and, in an Electron app, plainly false —
creating the window alone writes caches. "No changes to the config file are written to the disk" is checkable. The same goes for
"never", "no file", "no request": bound them to the artifact the story controls.

An AC asserts outcomes up to its own story's boundary. Where a scenario continues into behavior another story or component owns, name
that owner rather than re-specifying its mechanics — `**AND:** making the app appear once the backend responds is left to the splash
screen` instead of a `THEN` that duplicates the splash screen's contract. Referring to another story as the continuation is fine;
asserting how it works internally is not, because the two copies drift apart the moment one story is reworked. Do not refer to specific ACs,
only the story, since refining the ACs in a story may change numbering. Negative assertions about another story's triggers fall under the
same rule: "no unlock screen shows while the startup mode is `boot` or `configure`" belongs to the story that computes the mode, not to the
unlock screen's own story, which only has to get its own rendering right.

A story that changes existing behavior models that behavior for exactly one purpose: an invariant its own change could plausibly break.
"The four page routes keep their paths under the new parent route" and "the last opened page is still restored" earn their place when the
story re-parents those routes and moves the subscription that restores the page — they are regression guards. An AC restating behavior the
change does not touch is noise: no implementation can fail it, and it competes for attention with the ones that can. Such an AC also must
not measure against unstated history — "the page shows as before" is not checkable, "the page shows with the header and the side menu around
it" is.

Keep the ACs numbered consecutively (`AC1`, `AC2`, …), each with a short title that names what the `THEN` asserts rather than the intent
behind it: an AC titled "A correct password unlocks into the splash" whose `THEN` only enables a button promises something it never checks —
then either the title or the `THEN` is wrong. Name controls the way the UI labels them (the `OK` button, not "the confirm control"), so that
an AC and the screen it describes stay searchable against each other.
