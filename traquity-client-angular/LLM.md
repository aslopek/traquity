# LLM.md

This file provides guidance to LLM coding agents (Claude Code, etc.) when working with code in this repository.

## What this package is

The Angular + NgRx frontend, packaged as the Electron desktop app that ships to users. See the root `LLM.md` for how this fits together with
`traquity-api` and `traquity-server-spring`.

## Commands

- `npm run generate` — regenerate all API clients in `src/gen/api/*` from `../traquity-api` (config in `openapitools.json` +
  `api/openapi-config.json`). Run this after any spec change; `src/gen` is otherwise untouched by hand.
- `npm run serve` — `ng serve` at `http://localhost:4200`; requires the Spring backend running separately (e.g. `mvn spring-boot:run` in
  `traquity-server-spring`).
- `npm run build` — `clean` (dist/electron-out/gen) + `generate` + `ng build --base-href ./` + `licenses:generate`.
- `npm run watch` — incremental dev build (`ng build --watch --configuration development`), no dev server.
- `npm run electron:start` — run the packaged desktop shell locally via electron-forge (spawns the bundled backend jar from
  `resources/backend.jar`).
- `npm run electron:pack` — build an unpacked app. `forge.config.js`'s `generateAssets` hook copies
  `../traquity-server-spring/target/traquity-server-spring-<version>.jar` into `resources/backend.jar`, so the Spring backend must
  already be built (`mvn package`). Ignore `electron:make` script.
- `npm run licenses:generate` — collect licenses of packaged dependencies into a JSON file.
- `npm run licenses:check` — verify license compatibility of dependencies.
- `npm run test` — run all tests: `test:angular` first, then `test:electron`. Each runs standalone as well.
- `npm run test:angular` — the Angular suite (config in `jest.angular.config.ts`, uses `ts-jest`).
- `npm run test:electron` — type-checks `electron/` (`tsconfig.electron.json`) and then runs its specs (`jest.electron.config.ts`).
- `npx jest <path-to-spec>` runs a single file in either suite (`jest.config.ts` aggregates both).

## Architecture

- **Electron shell**: the Electron main process lives in `electron/` (entry point `electron/main.js`) and is the packaged desktop shell —
  it owns `traquity.config.json`, resolves Java, spawns the Spring backend jar as a child process and opens the `BrowserWindow` on the
  built Angular app. The backend is spawned only on an IPC call the renderer makes after opening, never before the window exists — see
  `electron/LLM.md` for its architecture, typing regime, testing and the boot order.
- **Startup screens and the app shell**: `AppComponent` is just a `<router-outlet>` plus the trigger that starts the backend immediately
  for a passwordless database (`boot` mode). The chrome (header, side menu, splash gate, the initial global-store loads) lives in
  `ShellComponent` (`src/app/shell/`), mounted under the root route behind `startupPhaseGuard`. `/unlock` (`src/app/unlock/`) is the real
  unlock screen, with its own screen-scoped Signal Store (`src/app/unlock/store/`) verifying a typed password against the stored hash over
  the bridge and driving `StartupStore.startBackend`. `/configure` (`src/app/configure/`) is the configuration screen: a frame of stacked,
  independently titled sections — not a wizard — around a screen-scoped `ConfigureStore` that `ConfigureComponent` provides and each
  section component injects. The frame owns the notices, the two finish buttons and the handover back to the startup flow; a section
  contributes its controls, one `*Valid` computed aggregated by `enableSaveAndStart`, and its slice of `ConfigurationChanges`. "Save &
  start" persists every section in a single `config:apply` write, "Discard & start" writes nothing and continues with the config as it was,
  and `store/routing/next-startup-step.ts` is the one place either of them decides what follows (a backend start with the password defined
  here, or the unlock screen for a file whose password can only be proven). Adding a section therefore means adding a component, a slice
  and one term in `enableSaveAndStart` — the frame itself is not touched. That split is what the store's folders express: a section's own
  computeds/effects/methods sit under `store/<section>/` (`store/database/computed|effects|methods`, and
  `store/java/computed|effects|methods`), while `store/computed|effects|methods` hold only the frame's own. The same split shapes the
  store's types, as a reading aid only: private `Frame*`/`Database*`/`Java*` slices that the exported
  `ConfigureStoreState`/`ConfigureComputed`/`ConfigureMethods` intersect back into one flat object. `/unlock`, `/configure` and `/insecure`
  (`src/app/insecure/`, admitted while the startup mode is `insecure` — see `electron/LLM.md`'s boot order for the
  `NODE_TLS_REJECT_UNAUTHORIZED` guard that produces it) are three sibling top-level routes with no chrome, rendered instead of the shell
  while the startup mode the main process computed calls for one of them.
  `src/app/startup/` is the renderer's only door to the main process: `StartupBridgeService` wraps the `contextBridge` surface
  (`window.traquity`, exposed by `electron/preload.js`) as observables, and `StartupStore` (a root-provided `@ngrx/signals` Signal Store,
  not a global-store slice — it is read by an app initializer, a route guard and both startup screens) holds the startup mode, phase,
  database path, the database's `authState` (what gates the unlock screen's `OK` button: only a stored `scrypt` record demands a local
  match) and the `startFailed` flag (set on a failed `backend:start`, cleared on the next attempt), and drives the `backend:start` call.
  `selectDatabase` is what keeps `databasePath`/`authState` correct once the configuration screen switches databases — the two arrive once
  from `startup:getState` and describe the database the app *started* against — and `enterUnlock` sits alongside
  `enterConfigure`/`enterBooting` as the way back into the unlock screen. Both `/unlock` and `/configure` route on the same `startFailed`
  flag rather than each carrying their own. `startup.initializer.ts` resolves the startup state from the bridge before the router's first
  navigation, which is what lets `startupPhaseGuard` decide synchronously which route to admit. In browser dev mode (`ng serve`, no bridge)
  none of this activates: the guard admits the shell immediately and the app loads. The Settings page (`src/settings/settings-page/`)
  carries a bridge-gated action, shown only while the bridge is available, that writes the one-shot `configureOnNextStart` flag and
  relaunches the app through the same `StartupBridgeService`. A settings section unrelated to startup/configuration gets its own bridge
  service alongside `StartupBridgeService`, shaped the same way (one `available` flag, one wrapper per channel deferring the call until
  subscription) rather than growing `StartupBridgeService` itself — `AiBridgeService`, wrapping the `ai:*` channels for the AI settings
  section (`src/settings/ai/`), is the reference.
- **Two kinds of state, kept strictly separate** — see the dedicated sections below for each:
  - The **global NgRx store** (`src/store/`) holds only data that's genuinely shared/global (loaded entities, cross-screen config) — never
    screen-local drafts or UI-only state.
  - **NgRx Signal Stores**, one per feature/dialog/wizard, colocated under that feature's own `store/` subfolder
    (e.g. `src/depot/depot-performance/store/`, `src/security/update-security/store/`), hold everything else: form drafts, wizard/tab
    progress, UI toggles, derived view state. A Signal Store can be shared by several components at once.
- **Feature folders** under `src/` (`depot`, `dividends`, `security`, `settings`) hold routed page/feature components and consume the global
  store + generated API clients directly, or a local Signal Store where one exists; `src/common` holds cross-feature building blocks
  (re-exported via `src/common/index.ts`: shared components, `tq-*` pipes for currency/date/decimal/percent formatting, the
  `ReadableSignalStore`/ `WritableSignalStore` types); `src/app` holds app-shell chrome (header incl. notifications, database connection
  dialog, splash screen, license, info, privacy).
- **The About dialog and the transparency note**: `src/app/info/` is the About dialog, two `mat-tab`s — `About` (version, license,
  third-party software; the tab that opens) and `Transparency`, which renders `PrivacyNoticeComponent` from `src/app/privacy/`. That
  component is static text and renders before a backend exists, which is what lets the note be read from every screen.
  `src/app/info/about-button/` is the icon that opens the dialog, which is why the header, `/unlock` and `/configure` all open the same
  dialog with the same size; `/insecure` deliberately offers none. The note is a disclosure, not a consent: nothing gates on it, and the
  root `LLM.md` states the rule that keeps its text true.
- **Custom Pipes**: Use the aforementioned custom pipes instead of angular default pipes. In addition, there are pipes for specific purposes
  which must be used instead of accessing raw properties:
  - `country.pipe.ts`: displaying country flag emojis
  - `depot-logo-url.pipe.ts`: use in conjunction with `<img>` for displaying a depot's logo
  - `file-preview.pipe.ts`: use for displaying files (e.g. images or other content) inserted by the user. Be aware that the user may
    unknowingly insert attacker-controlled content such as malicious PDF.
  - `security-logo-url.pipe.ts`: use in conjunction with `<img>` for displaying a security's logo
  - `security-name.pipe.ts`: use to display security names. Unlike security groups, it is not allowed to access raw `security.name` property
    for this purpose.
  - `security-symbols.pipe.ts`: use to concatenate all `security.symbols` for displaying.
  - `security-type-display-name.pipe.ts`: use to display a human-readable name for the given `SecurityType`. It must never be rendered raw.
  - `transaction-type-display-icon.pipe.ts`: use in conjunction with `<mat-icon>` for displaying an icon for the given `TransactionType`
  - `transaction-type-display-name.pipe.ts`: use to display a human-readable name for the given `TransactionType`
- **Generated API clients** (`src/gen/api/<domain>/`): one Angular service class per spec (e.g. `DepotApi`, `ConfigApi`, `DividendApi`),
  injected directly into effects/Signal Store code — there is no handwritten HTTP layer on top (exception: GitHub update check).
- Charts use `ngx-echarts` with `echarts/core` and only the chart types/components registered in `app.config.ts` (`BarChart`, `LineChart`,
  `PieChart`, `Grid`/`Legend`/`Tooltip`, `SVGRenderer`) — add new echarts features to that `echarts.use([...])` call, not ad hoc per
  component.
- **Derived state belongs in the store, rendered artifacts belong in pipes.** The line is drawn by what the thing *is*, not by
  where its inputs come from:
  - **Deriving is what selectors and computeds are for** — keep doing it there. A global-store selector
    (`selectors/<name>.selector.ts`) or a Signal Store computed (`store/computed/<name>.ts`) may filter, join, aggregate, sort
    and reshape domain data as much as a screen needs, including combining several slices or merging local signals with global
    selectors (`depot-performance/store/computed/depot-values.ts` is the reference).
  - **A rendered artifact never lives in a store** — not in a slice's state, not in a selector, not in a Signal Store computed.
    That means an echarts options object, SVG geometry (path/arc data drawn as chart chrome), a composed label/tooltip string:
    anything whose shape is dictated by the thing that draws it rather than by the domain.
  - **A pure custom pipe is the seam between the two**: it takes the derived state and produces the rendered artifact, in the
    template. Never build one in a component field, a component method, a component-level `computed()`, or an inline template
    expression. A component-level `computed()` stays fine for plain local logic (a disabled flag, which branch to render) — just
    never for an artifact.
  - **Chart options** for echarts get one dedicated pipe per chart (e.g. `dividend-bar-chart.pipe.ts`,
    `position-pie-chart.pipe.ts`).
  - When several bindings need the same pipe result, bind it once with `@let` instead of repeating the pipe expression. Chain
    pipes in the template rather than precomputing a value in the component.
  - A pipe that needs formatting injects the `tq*` pipes (see `position-pie-chart.pipe.ts`); the consuming component then lists
    them in its `providers`. Pipes may inject other pipes the same way.
  - Pass everything a pipe needs as an argument. A pure pipe re-runs only when its arguments change identity, so a signal it
    reads on its own (e.g. `hideAbsoluteValues`) can change without the rendered text ever being recomputed.

## Global NgRx store conventions

Treat the `security` slice (`src/store/security/`) as the canonical template for any new or extended slice:

- Top level: `<slice>.state.ts`, `<slice>.actions.ts` (one `createActionGroup`, with a named `*ActionArgs` type exported per action that
  takes props), `<slice>.reducer.ts`, `<slice>.selector.ts`.
- `effects/` subfolder — one file per action, exporting a function that takes `actions$` (+ whatever API/store deps it needs) and returns
  the effect; `<slice>.effects.ts` only wires these into `createEffect(...)` calls, it never contains effect logic itself.
- **An effect stays pure rxjs — no `async`, no `await`, no `Promise`, no `firstValueFrom`.** Everything an effect needs is already an
  `Observable` (the generated API clients, `store.select(...)`), so compose it with operators: `switchMap`/`concatMap`/`mergeMap` returning
  the API call, `map` to the success action, `catchError` to the error action, `concatLatestFrom` for store reads. This is a testability
  rule as much as a style one — a `Promise` resolves on the real microtask queue, which rxjs virtual time cannot observe, so an `async`
  callback makes the effect untestable with marbles and gives up on asserting timing and cancellation (see `Testing` below).
  `set-position-group-by.effect.ts` is the reference. Several older effects predate this rule and wrap `firstValueFrom` in an `async`
  helper — don't copy them; a change to one of them is a good opportunity to convert it.
- `reducers/` subfolder — one pure function per state transition (e.g. `overwrite-security.reducer.ts`), composed with `on(...)` in
  `<slice>.reducer.ts`.
- `selectors/` subfolder — one function per derived value, following **dependency inversion**: each selector file declares its own minimal
  input type as a `Pick<SliceState, '...'>` (e.g.
  `GetHistoricalSecurityPriceConfigState = Pick<SecurityState, 'historicalSecurityPriceConfigs'>`) containing only the fields it actually
  reads, and the function is typed against that, not against the full `SliceState`. `<slice>.selector.ts` then composes
  `createFeatureSelector` + `createSelector` with these functions to produce the public `MemoizedSelector<AppState, T>` exports. New
  selectors must follow this pattern (some older selectors in this codebase predate it and take the full state directly — don't copy those).
- Only put data in a slice's state if it's genuinely global (needed across unrelated components/screens or persisted/loaded once and read
  from many places). Everything else belongs in a Signal Store.
- **If two domains interact with each other, dependency inversion must be used.** A domain in this sense is a global-store slice. Say
  domain A performs an action (whether pure or with side effects) and Domain B needs to adjust after A is done. Then A does not dispatch
  one of B's actions, it rather dispatches a (`...Done` | `...Success` | `...Error`) action from its own domain. B listens to these
  actions in a dedicated `<verb>-<noun>-on.effect.ts` and reacts appropriately (see `depot/effects/reload-depots-on.effect.ts` and
  `security/effects/load-securities-on.effect.ts` for the pattern, including how to add further triggering actions). This rule is scoped
  to global-store slices only: components and Signal Stores are not domains and may dispatch any slice's actions directly.
- **Dependency inversion governs writing, not reading.** A slice's `<slice>.selector.ts` may compose another slice's public selectors
  (e.g. `createSelector(positions, securitiesById, ...)`): that is a pure, memoized read which creates none of the ordering or
  control-flow coupling the rule above exists to prevent, and it is the normal way to derive data spanning two domains — prefer it over
  joining the two slices in a component. Two constraints: read only along the direction the domain data already points (a depot position
  carries `securityIds`, so depot → security, never the reverse), and keep the composing selector in the slice that does the reaching, so
  a pair of slices never imports one another in both directions. The composed pure function then takes the already-derived values as its
  parameters instead of a `Pick<SliceState, '...'>`, which is the same minimal-input principle.

## Signal Stores (component/feature-local state)

Use `@ngrx/signals` (`signalStore`) for state scoped to a component or a small subtree — form drafts, wizard steps, dialog/tab state,
UI-only toggles. Never put this in the global store, and never duplicate global data into a Signal Store's own state — read it live via
`globalStore.selectSignal(...)` instead.

**`depot-performance/store/` is the newest Signal Store in the codebase and the canonical reference for current architecture rules** (some
older stores, e.g. `add-security-wizard.store.ts` / `update-security.store.ts`, predate parts of this pattern — prefer the
`depot-performance` style for new work). Its file layout:

- `<name>.store.ts` — defines `<Name>State`, `<Name>Computed`, `<Name>Methods` types, `initialState`, and the store itself via
  `signalStore(withState(...), withComputed(...), withMethods(...), withHooks(...))`. Exports a
  `Readable<Name>Store = ReadableSignalStore<State, Computed, Methods>` type alias for consumers that only read state/call methods.
- `computed/<name>.ts` — one exported function per computed signal. Takes `ReadableSignalStore<State>` (and, when it needs global data, the
  injected `Store<AppState>`) as parameters and returns an explicitly-typed `Signal<T>`. This is where local state and global-store
  selectors get combined (see `computed/depot-values.ts`, which merges the store's own `dataRange`/`addCashToAbsoluteValue` signals with the
  global `depotPerformance` selector).
- `methods/<name>.ts` — one exported function per mutation, taking `WritableSignalStore<State, Computed>` plus its own args and calling
  `patchState(...)`.
- `effects/<name>.ts` — one exported function per side-effecting `rxMethod`, hooked up in `withHooks.onInit`. The pure-rxjs rule from the
  global store's `effects/` applies here too: compose operators, never `async`/`await`/`firstValueFrom`.
- Domain-specific helper types/logic that don't fit `computed`/`methods`/`effects` get their own subfolder (see `benchmark/` in
  `depot-performance/store/`).

Always type the `withComputed`/`withMethods` factory parameters explicitly using `ReadableSignalStore<...>` / `WritableSignalStore<...>`
from `src/common/types/signal-store.type.ts` — never let them be inferred, and never pass the raw store class type around.

**One Signal Store instance can serve several components at once**: provide it once in a
container component's `providers: [XStore]`, then have descendant components
`inject(XStore)` directly (typed as `Readable<X>Store`). Examples:

- `DepotPerformanceComponent` provides `DepotPerformanceStore`; its children (`DataRangeSelectionComponent`,
  `DepotPerformanceKpisComponent`, `DepotPerformanceChartComponent`, `TransactionOverviewComponent`, `BenchmarkComponent`) each
  `inject(DepotPerformanceStore)` independently.
- The "Create Security Wizard" (`AddSecurityWizardComponent`) provides `addSecurityWizardStore` once, shared across its wizard steps.
- The Edit Security Modal (`UpdateSecurityComponent`) provides `updateSecurityStore` once, shared across its tabs.

## TypeScript conventions

- Strict typing throughout; avoid inferred types wherever practical — annotate function return types, `const` bindings holding non-trivial
  values, and store/selector/effect parameters explicitly (as in all examples above).
- When no existing type fits exactly, define a new, narrowly-scoped one (e.g. a `Get<X>State` selector input, an
  `<X>ActionArgs`/`<X>EffectArgs` type) rather than widening an existing type or leaving it inferred.
- Use `type` over `interface`. Use `interface` if and only if there is a class implementing the interface.
- **Doc comments obey dependency inversion** (root `LLM.md`, "Dependency inversion binds the docs too"): a selector, computed, method,
  effect or store helper documents its own contract, never which component or screen calls it, in which order the callers run, or what
  another slice/screen does with the result afterwards.
- **Input from outside the program is defined exactly once, as a zod schema, and its static type is inferred from that same schema** —
  the renderer's half of the boundary rule `electron/LLM.md` states in full. The case here is a file the user imports: the data source
  configuration files are described by `src/settings/data-source/data-source.schema.ts`, mirroring
  `HistoricalSecurityPriceDataSourceCreate` and `DividendAnnouncementDataSourceCreate` of the API specs, and every type in
  `data-source.type.ts` is a `z.infer` over it. `JSON.parse` returns `any`, so its result goes straight into a `safeParse` and never
  flows on untyped; a hand-rolled type predicate over parsed JSON is what the schema replaces. Data arriving over HTTP is not this
  case — a generated API client already types it. Everything the app constructs itself stays a plain `type`.

## Date display

- The user-configured date format and locale live in the app-config slice (`getDateFormat`/`getDateLocale` selectors). `TqDatePipe`
  (`src/common/pipe/tq-date.pipe.ts`) applies them — always display dates through it, never through Angular's raw `date` pipe.
- `mat-datepicker` inputs get the same formatting via `TqDateAdapter` (`src/common/date/tq-date-adapter.ts`, delegates to `TqDatePipe`),
  provided app-wide as the `DateAdapter` in `app.config.ts`. New date pickers therefore need only `MatDatepickerModule` in the component's
  `imports` and inherit the configured format automatically. Never import `MatNativeDateModule` (or use `provideNativeDateAdapter`) at
  component level — a standalone component's NgModule imports contribute providers to the component injector, so it would silently shadow
  `TqDateAdapter` with the native adapter for that subtree. `MatNativeDateModule` belongs in `app.config.ts` only.
- Keep datepicker inputs `readonly` with click-to-open (see `stock-split.component.html`): `TqDateAdapter` only overrides `format()`, so
  typed input would fall through to the native `parse()` and not respect the configured format.

## Templates

- Only the modern control-flow syntax (`@if`/`@else`/`@for`/`@switch`). `*ngIf`/`*ngFor`/`*ngSwitch` must not be used in new or edited
  templates.
- New components are always standalone.
- Tag line-wrapping rule: a tag is "too long" if at least one of the following is true:
  - it has more than one attribute
  - exactly one attribute together with at least one child
  - more than one child.
    A tag that is not too long (meets none of above conditions) stays on one line. Otherwise: the first attribute stays on the opening-tag
    line, every further attribute gets its own line, every child gets its own line, and the closing tag gets its own line. Example (from
    `data-range-selection.component.html`):
  ```html
  <mat-button-toggle (click)="setDataRange('max')"
                     [checked]="dataRange() === 'max'">
    Max
  </mat-button-toggle>
  ```

## Styling (SCSS units)

- Use `rem` for CSS lengths (font-size, padding, margin, gap, width/height, border-radius, border-width, letter-spacing, etc.) in every
  `.scss` file and inline template style. Never write `px` or `em` — use `rem` from the start rather than authoring in `px`/`em` and
  converting later.
- The only accepted exception is a value that must deliberately scale with the font-size of the *same element it's declared on* (e.g. a
  `border-radius`/`padding` pair that keeps a pill/badge shape proportional to that badge's own `font-size`, itself set in `em`) — see
  `performance-label.component.scss` and the `.performance-positive`/`.performance-negative` rules in `position-list.component.scss` for the
  pattern. Add a one-line comment explaining the coupling when you use it, and don't reach for it otherwise.
- Avoid inline styling. Only if it supports readability, this is allowed. E.g. when dividing `width` among columns.

## Fonts

All families the app renders are **bundled, never fetched at runtime**. They enter the build through `angular.json`'s `styles` array (the
two package stylesheets) and `src/fonts/noto-color-emoji-flags.scss` (the one hand-written `@font-face`), and `ng build` emits the
referenced files into `dist/traquity/browser/media/`. `index.html` links no stylesheet and the CSP grants `font-src 'self'` only, so a
remote font cannot load even if one is added by accident.

Three reasons this is a rule rather than a preference, in the order they bite:

- `<mat-icon>` renders **ligatures** (`app.config.ts`'s `setDefaultFontSetClass`), so an icon whose font did not load shows its own
  name as text.
- A request per start tells a third party when this app runs, which is the opposite of what the README promises.
- `country.pipe.ts` maps a country code into `U+1F1E6`-`U+1F1FF` and nothing else, so the `@font-face` for Noto Color Emoji carries
  a `unicode-range` of exactly that — a 5.5 MB color font has no business being consulted for any other character.

Adding or changing a font means: import it in `angular.json`'s `styles`, keep it in `dependencies`, and **never subset or otherwise
modify the file** — under OFL-1.1 a modified font may not keep its reserved name. Attribution needs no action:
`scripts/generate-third-party-licenses.js` collects any package a stylesheet references, so the import itself is what puts the license into
the "About" dialog. `forge.config.js` keeps the font binaries under `node_modules` out of the package — they are build input, and the copies
in `dist/` are the ones that ship.

## Testing

Electron main-process specs live under `electron/`, with their own jest config and their own conventions on top of the ones below — see
`electron/LLM.md`.

The focus on testing in the angular app is on logic. Use `jest` to test:

- NgRx global store
  - effect functions (contents of `src/store/<slice>/effects`)
  - reducer functions (contents of `src/store/<slice>/reducers`)
  - selector functions (contents of `src/store/<slice>/selectors`)
- signal stores
  - effect functions (contents of `<path>/store/effects`)
  - method functions (contents of `<path>/store/methods`)
  - computed functions (contents of `<path>/store/computed`)
  - if applicable, contents of other subdirectories
- angular pipes: `*.pipe.ts` — instantiate the pipe directly with mocked constructor deps, no TestBed; see `security-name.pipe.spec.ts`
  for the pattern (including mocking a `Store` whose `selectSignal` serves several selectors, dispatched by selector identity)
- If important for the logic, components may also have a unit test; however logic should preferably reside in global or signal stores
- **Effects are tested with marble testing** (rxjs `TestScheduler`), and so is any other observable logic that resolves purely through rxjs
  operators/schedulers. Marbles are what makes timing and cancellation assertable at all — that a `switchMap` drops an in-flight request
  when the next action arrives is invisible to a `firstValueFrom` assertion. See `set-position-group-by.effect.spec.ts` for the pattern:
  - Create every marble (`cold`/`hot`) **inside** `scheduler.run(...)`. Outside it a different frame factor applies, so marbles built in
    `beforeEach` silently don't line up with the ones in the expectation.
  - Feed the effect a hot action stream that never completes (`new Actions(hot(...))`), so the expectation sees the effect's own emissions
    and nothing else.
  - Declare the values of the **input** stream once in `beforeEach` as the spec's marble alphabet — including the letters only some tests
    need (an action carrying a different payload, an action the effect must ignore) — and let each test pick letters instead of rebuilding
    the value map. The **expected** values are not part of that alphabet: they are what the test asserts, so they stay inline at the call
    site, even when that repeats them across tests. A reader must never have to scroll up to learn what a test claims.
  - Keep the marble strings (action stream, API response) themselves as part of the `beforeEach` baseline, so a test alters one precondition
    by assigning one string, and share the `scheduler.run(...)` call through a small local helper. Prefer altering the marble string over
    altering the alphabet: the changed precondition then shows up in the test's own line rather than in a value the test only references.
  - Space the response marble far enough from the action marble that no two events land on the same frame — emissions scheduled on the same
    frame are ordered by scheduling order, which turns the assertion into a coin flip.
  - After a marble test passes, break its expected marble once and check that it fails for the expected reason: a wrong-but-passing
    expectation is the normal failure mode of marble tests.
- In every `*.spec.ts` file, import exactly the jest symbols being used (`afterEach`, `beforeAll`, `beforeEach`, `describe`, `expect`,
  `it`, `jest`, ...) explicitly from `@jest/globals` — never rely on ambient globals, and don't import symbols the file doesn't use.
- Testing philosophy
  - Use mocks wherever possible over real instances of dependencies and function arguments.
  - **A collaborator reached through a plain `import` is a dependency like any other — mock it with `jest.mock()`.** Nothing about a
    module-level function makes it part of the unit under test: leaving it real turns the spec into a test of the combination, and the
    assertions then have to reach past the unit's own boundary to that collaborator's collaborators Assert the handover instead: that the
    unit called the collaborator, with which arguments, how often — and never what the real collaborator would have done next.
    `discard-and-start.spec.ts` is the reference.
    - Mechanics: `jest.mock('<path>', () => ({<fn>: jest.fn()}))` at the top of the file, the mocked function's signature as a local
      `type`, and a `let <fn>Mock: jest.Mock<Signature>` assigned from the imported binding in `beforeEach()`. Module mocks live for the
      whole file, so reset it there too, or call counts leak from one test into the next.
  - **A call assertion states both what and how often**: every `toHaveBeenCalledWith(...)` is accompanied by a `toHaveBeenCalledTimes(n)`
    on the same mock, and every `toHaveBeenCalledTimes(n)` by the arguments of those calls. Each half alone leaves the other free: `With`
    passes as long as *one* of the calls matched, so a unit calling a collaborator three times when it should call it once stays green;
    `Times` passes for the right number of entirely wrong calls. Together they are one claim about the handover. `not.toHaveBeenCalled()`
    is exempt — it already says both — and is what a zero count is written as, never `toHaveBeenCalledTimes(0)`. A collaborator taking no
    arguments gets `toHaveBeenCalledWith()`, which asserts exactly that none were passed; there is no such thing as a mock too small for
    the pairing.
  - For **n > 1 calls**, don't write n `toHaveBeenCalledWith(...)` lines: assert the whole log at once with
    `expect(fn.mock.calls).toEqual([[...], [...]])`. One array literal covers count, arguments and order, and order is usually part of what
    the test claims (a directory removed before the rename that replaces it, not after). This is the same "prefer one `toEqual` on the whole
    expected result" rule the assertion list below states, applied to a mock's calls.
  - `beforeEach()` sets up the baseline. The **first test function** in the file is the baseline case itself - no extra arrange, just act +
    assert. Every other test changes exactly one precondition in its own arrange step, then does act + assert.
  - **A complex object shared across a `describe()`'s tests is declared `let` at `describe()` scope and assigned inside `beforeEach()`,
    never `const`.** A `const` initialized in the `describe()` body (or in a nested one) is one mutable object instance reused by
    reference across every test in that block; a mutation by one test, or by the code under test, then leaks into the next test's arrange
    step, and the leak only shows up as a failure that depends on run order. Assigning a fresh instance in `beforeEach()` gives every test
    its own copy. This applies to any complex/mutable object — plain objects, arrays, factory-produced fixtures, mocks — a primitive
    (`string`, `number`, `boolean`) is fine as `const` at `describe()` scope, since it cannot be mutated in place.
  - Use nested `describe()` if you want multiple tests with the same alteration from the baseline: the shared alteration goes into the
    nested `describe()`'s own `beforeEach()` — never into the `describe()` body, which runs at collection time, before any `beforeEach()`.
    E.g. if tests only make sense if they alter n > 1 preconditions, then the nested `describe()`'s `beforeEach()` may alter up to n-1
    preconditions and each test case alters exactly one in its own arrange step.
  - **The baseline state of a store is always the store's own `initialState`**, shallow-copied — `state = {...initialState}` for a global
    store slice, the Signal Store's `initialState` for a Signal Store. Never hand-build a full state object in `beforeEach()`: it
    duplicates defaults the store already declares and drifts the moment the state type gains a field.
  - A nested `describe()`'s `beforeEach()` (or a test's own arrange step) then spreads over that baseline and overwrites **only the
    properties that differ from `initialState`**, so every value a test sets is by definition a precondition that test depends on. That
    keeps the setup short and makes what a test actually varies readable at a glance.
  - TypeScript conventions set forth in this file (line length, strong type safety etc.) also apply for tests.
  - use `toBe(...)` whenever referential equality is important - e.g. when a reducer returns the input state
  - Prefer test data factories over verbose inline object initializers. Once a generated/domain type is used by more than one spec, add a
    `<name>Factory(overrides?: Partial<Type>): Type` function for it in `src/testing/` (one file per type, e.g. `security-read.factory.ts`,
    re-exported via `src/testing/index.ts`), returning a fresh object with sensible defaults and spreading `overrides` last so individual
    tests only specify the fields they care about.
  - Prefer the tightest true invariant over a type-only check (`expect.any(String)` passes for any string, including a wrong one) whenever
    the domain gives you something cheap to check. When no built-in matcher expresses it, write a custom asymmetric matcher: a class
    extending `expect`'s exported `AsymmetricMatcher<T>` (`@extends {AsymmetricMatcher<T>}`), implementing `asymmetricMatch(other)`,
    `toString()` **and** `toAsymmetricMatcher()` — the base class's own types mark `toAsymmetricMatcher` optional, but `pretty-format`'s
    diff renderer throws without it on a failing match, and a plain `{asymmetricMatch, toString}` object (no `AsymmetricMatcher`
    inheritance) prints as a raw `[Function]` dump on failure instead of the matcher's label, because only a real subclass carries the
    `$$typeof` tag the renderer keys off. A matcher used by more than one spec gets its own file and its own spec in `src/testing/`,
    alongside the data factories — it is logic, not a fixture.
  - An expected value is written as an expression over the arranged fixtures, not a recomputed literal — `apple.buyInAbsolute +
    microsoft.buyInAbsolute` instead of `150`, `apple.securityIds[0]` instead of `1`. A reader then verifies the assertion by looking at
    the arrange step alone, never by re-doing the selector's/reducer's arithmetic in their head, and the test keeps passing for the right
    reason when a fixture's value changes. This applies to full-object assertions too: prefer one `toEqual` on the whole expected
    result/group over several narrow assertions on individual fields, so the test doubles as a complete, at-a-glance cross-check against
    the arranged input.
