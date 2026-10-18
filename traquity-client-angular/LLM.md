# LLM.md

Guidance for LLM coding agents (Claude Code, etc.) working in this package.

## What this package is

Angular + NgRx frontend, packaged as the Electron desktop app. Root `LLM.md` covers how this fits with `traquity-api` and
`traquity-server-spring`.

## Commands

- `npm run generate` — regenerate API clients in `src/gen/api/*` from `../traquity-api`. Run after any spec change. Never touch
  `src/gen` by hand.
- `npm run serve` — `ng serve` at `http://localhost:4200`; needs a backend running separately.
- `npm run build` — clean + generate + `ng build` + license generation.
- `npm run electron:start` — run the packaged desktop shell locally.
- `npm run electron:pack` — build an unpacked app. Needs `../traquity-server-spring` already built (`mvn clean package`) — packaging
  copies the jar into `resources/backend.jar`. Ignore `electron:make`.
- `npm run licenses:generate` / `licenses:check` — collect / verify licenses of packaged dependencies.
- `npm run test` — `test:angular` + `test:electron`; each runs standalone too. `npx jest <path>` runs one file.

## Architecture

- **Electron shell**: main process in `electron/` (`electron/main.js`). Owns config, resolves Java, spawns the backend jar, opens
  the window. Backend spawns only on an IPC call from the renderer, after the window opens. See `electron/LLM.md`.
- **Bridge to the main process**: `src/bridge/` is the renderer's only door to the main process, over `contextBridge` globals.
  One service per global, each an `available` flag plus one wrapper per channel, deferring the IPC call until subscription so it
  reads as an observable. Lives beside `src/store/`/`src/gen/`, not under `src/app/` — a bridge is consumed wherever its channels
  belong, not just by app-shell code. A new channel on an existing global is a new wrapper on that global's service, never a
  direct reach into another service's global. A new `contextBridge` global gets its own service and type file.
  - Every one of these services reaches its global through the shared `BRIDGE_HOST` injection token, which resolves
    `globalThis` and never `window` directly — that is what lets the node-environment jest suite inject a stub.
- **Startup screens and the app shell**: `AppComponent` is a router outlet plus the trigger that starts the backend immediately
  for a passwordless database. Shell chrome (header, side menu, splash, initial global-store loads) lives in `ShellComponent`,
  behind `startupPhaseGuard`.
  - Unlock, configure and an insecure-mode screen are sibling top-level routes with no chrome, shown instead of the shell while
    the startup mode calls for one.
  - The configure screen is a frame of independently titled sections (not a wizard) around a screen-scoped store. The frame owns
    the notices and the two finish buttons; a section contributes its own controls/validity/config slice. Adding a section means
    adding a component, a slice, and one term in the frame's aggregate validity — never touching the frame itself.
  - A dedicated startup store (not a global-store slice) holds startup mode/phase/database info and drives the backend-start
    call; an app initializer resolves it before the router's first navigation so routing can decide synchronously. In browser
    dev mode (no bridge), none of this activates — the shell is admitted immediately.
  - The Settings page carries a bridge-gated relaunch action, shown only while the bridge is available.
- **Two kinds of state, kept strictly separate**:
  - Global NgRx store (`src/store/`): only genuinely shared data (loaded entities, cross-screen config). Never screen-local
    drafts or UI-only state.
  - NgRx Signal Stores, one per feature/dialog/wizard, colocated under that feature's `store/` subfolder: form drafts, wizard
    progress, UI toggles, derived view state. One instance can serve several components.
- **Feature folders** under `src/` hold routed page/feature components, consuming the global store + generated API clients
  directly, or a local Signal Store where one exists. `src/common` holds cross-feature building blocks. `src/app` holds app-shell
  chrome.
- **About dialog / transparency note**: the About dialog renders the privacy notice as static text, before a backend exists, so
  it's readable from every screen. It's a disclosure, not a consent gate. Root `LLM.md` holds the rule that keeps its text true.
- **Error notifications**: dispatch an error action from the notification slice; the snackbar renders them as a dismissable
  stack. The message is the finished user-facing sentence, authored where the failure is caught — the slice stores it unchanged.
  Putting the screen back into a consistent state is the dispatcher's job, not the slice's.
- **Custom `tq-*` pipes are mandatory over raw property access** for: country flags, a depot/security logo URL (with `<img>`),
  user-inserted file previews (treat as attacker-controlled content), security names, security symbols, security/transaction
  type display names and icons. Never render these fields raw.
- **Generated API clients** (`src/gen/api/<domain>/`): one Angular service per spec, injected directly into
  effects/Signal Store code. No handwritten HTTP layer on top, except the GitHub update check.
- **Charts**: `ngx-echarts`, only the types/components registered centrally in `app.config.ts`. Add new echarts features there,
  never ad hoc per component.
- **Derived state belongs in the store; rendered artifacts belong in pipes.** The split is by what the thing *is*:
  - Selectors/computeds may filter, join, aggregate, sort, reshape — as much as a screen needs.
  - A rendered artifact (echarts options, SVG geometry, a composed label/tooltip string) never lives in a store — not in state,
    not in a selector, not in a computed.
  - A pure custom pipe is the seam: derived state in, rendered artifact out, bound in the template. Never build one in a
    component field, method, `computed()`, or inline template expression. A component-level `computed()` stays fine for plain
    local logic (a disabled flag, which branch to render).
  - One dedicated pipe per chart for chart options.
  - Bind a repeated pipe result once with `@let`. Chain pipes in the template; don't precompute in the component.
  - A pipe needing formatting injects the `tq*` pipes itself; the consuming component lists them in its `providers`.
  - Pass everything a pipe needs as an argument, not a signal it reads on its own — a pure pipe only re-runs when its arguments'
    identity changes.

## Global NgRx store conventions

- One actions/reducer/selector/state file per slice, effects in one file per action (never piled into the slice's `.effects.ts`,
  which only wires them up).
- **An effect stays pure rxjs** — no `async`/`await`/`Promise`/`firstValueFrom`. Compose with `switchMap`/`concatMap`/`mergeMap`
  → `map`/`catchError`, `concatLatestFrom` for store reads. An `async` effect can't be tested with marbles and can't assert
  timing/cancellation. Older effects wrapping `firstValueFrom` predate this — don't copy them; converting one is a good use of a
  touching change.
- One pure reducer function per state transition, composed with `on(...)`.
- **Selectors follow dependency inversion**: each selector function is typed against a minimal `Pick<SliceState, '...'>` of only
  the fields it reads, never the full slice state. Some older selectors take the full state — don't copy those.
- Put data in a slice's state only if it's genuinely global. Everything else belongs in a Signal Store.
- **Cross-domain writes use dependency inversion; reads don't.** A domain here is a global-store slice. If slice A acts and slice
  B must adjust, A dispatches its own outcome action — never one of B's; B listens via its own effect. This is scoped to
  global-store slices: components and Signal Stores aren't domains and may dispatch any slice's actions directly. A slice's
  selector may freely compose another slice's public selectors (a pure, memoized read creates none of the ordering coupling the
  write-side rule prevents) — but only along the direction the domain data already points, and the composing selector lives in
  the slice doing the reaching, so no pair of slices imports each other both ways.

## Signal Stores (component/feature-local state)

- `@ngrx/signals` (`signalStore`) for state scoped to a component or small subtree. Never put this in the global store, and
  never duplicate global data into one — read it live via the global store.
- One exported function per computed/method/effect, under `computed/`/`methods/`/`effects/` in the store's own folder; the store
  file itself only composes `withState`/`withComputed`/`withMethods`/`withHooks`. Always type the factory parameters explicitly
  with the project's `ReadableSignalStore`/`WritableSignalStore` types — never inferred, never the raw store class.
- One Signal Store instance can serve several components: provide it once in a container, have descendants inject it read-only.

## TypeScript conventions

- Strict typing throughout. Avoid inferred types for function return types, non-trivial `const` bindings, and
  store/selector/effect parameters.
- When no existing type fits, define a new narrowly-scoped one instead of widening or leaving inferred.
- `type` over `interface`. `interface` if and only if a class `implements` it.
- **Barrel files are forbidden.** Never add an `index.ts` re-export. Generated code is exempt.
- Doc comments obey dependency inversion (root `LLM.md`) — document the unit's own contract, never its callers.
- JSDoc, if present, states every parameter via `@param` and the return via `@returns` — never folded into prose. Not every
  function needs JSDoc.
- **Input from outside the program is defined exactly once, as a zod schema, with its static type inferred from that schema** —
  the renderer's half of the boundary rule `electron/LLM.md` states in full. Applies to anything the user hands the app to
  parse (e.g. imported config files). Not to API responses — a generated client already types those. Everything the app
  constructs itself stays a plain `type`.

## Date display

- Always display dates through the project's date pipe, which applies the user-configured format/locale. Never Angular's raw
  `date` pipe.
- `mat-datepicker` gets the same formatting through the project's date adapter, provided app-wide. A new date picker needs only
  the Material datepicker module in its own imports — never import the native date adapter module at component level; it
  silently shadows the project's adapter for that subtree.
- Keep datepicker inputs read-only with click-to-open — the adapter only overrides formatting, not parsing.

## PDF extraction (`src/common/pdf/`)

- A PDF is parsed **in the UI**, not sent to a server for parsing.
- One module is the only `pdf.js` adapter; everything else downstream is pure and independently testable.
- **The currency is an input, never a lookup** — extraction takes the one code amounts may be denoted in, and only marks an
  amount where exactly that code stands beside it.
- **This package is the only place a page's notation is read.** Each reader exposes every plausible reading of an ambiguous
  token (likeliest first) and a second step that commits to the first one. A notation added here reaches the whole pipeline
  with no second edit elsewhere.
- The geometry-stage tolerances are tuned constants with no unit test that can tell a good split from a bad one — a hand
  change here is an uncaught regression.
- The parse is bounded (page count, run count, time budget) — an unbounded parse can hang the window.
- `pdfjs-dist` is a devDependency, like every UI library.
- The shared one-document PDF-import pipeline (used by both PDF import entry points) reaches the AI bridge; `src/common/pdf/`
  itself stays parse-only and knows nothing about AI or a bridge.

## Directives

Decide nothing in a directive about the data it emits — validation and messaging belong to the caller. Keep the directive's
boundary a plain `@Input`/`@Output` pair, not `input()`/`output()`, if the directive's spec must run outside a TestBed/injection
context.

## Templates

- Only modern control flow (`@if`/`@else`/`@for`/`@switch`). Never `*ngIf`/`*ngFor`/`*ngSwitch` in new or edited templates.
- New components are always standalone.
- A tag is "too long" when it has more than one attribute, or one attribute plus a child, or more than one child. A tag that
  isn't too long stays on one line; otherwise: first attribute on the opening-tag line, every further attribute and every child
  on its own line, closing tag on its own line.

## Styling (SCSS units)

`styleguide.md` is the binding reference for how this app looks — read it before writing any styling. On top of it:

- Use `rem` for every CSS length. Never `px`/`em` — don't author in `px` and convert later.
- Exception: a value that must scale with the *same element's own* font-size (itself in `em`) — add a one-line comment
  explaining the coupling, and don't reach for this otherwise.
- Avoid inline styling. Allowed only where it aids readability (e.g. dividing width among columns).

## Fonts

- Every rendered font family is **bundled, never fetched at runtime** — through the Angular build's styles array, nothing via a
  linked stylesheet. The CSP grants `font-src 'self'` only.
- Reasons this matters: icon ligatures render as text if the font fails to load; a runtime font fetch tells a third party when
  the app runs, against the privacy notice; the emoji font's `unicode-range` is scoped to exactly what the app needs rendered.
- Adding/changing a font: import it in the build's styles array, keep it a `dependency`, and never subset or modify the file
  (OFL-1.1 forbids a modified font keeping its reserved name). Check if the attribution mechanism holds for the new font.

## Testing

Electron main-process specs live under `electron/` with their own config and conventions — see `electron/LLM.md`.

`package.json`'s `overrides` block lifts one range on purpose: `ts-jest` caps its optional `@babel/core` peer at `<8` while
Angular pulls `@babel/core@8`. `ts-jest` is configured without `babelConfig` and never loads babel here; `babel-jest` is the
transform that does, and it accepts 8. Keep the override until `ts-jest` widens the range.

Testing here focuses on logic: NgRx effects/reducers/selectors, Signal Store effects/methods/computeds, pipes (instantiate
directly, no TestBed), and components only where logic genuinely lives there (prefer pushing logic into a store instead).

**Effects, and any other rxjs-resolved observable logic, are tested with marble testing** (`TestScheduler`) — it's what makes
timing and cancellation assertable (e.g. that a `switchMap` drops an in-flight request).

- Build every marble **inside** `scheduler.run(...)` — outside it, a different frame factor applies and marbles silently
  misalign.
- Feed the effect a hot, non-completing action stream, so the expectation sees only the effect's own emissions.
- Declare the input stream's marble alphabet once in `beforeEach`. Keep expected-value marbles inline at the call site, even
  when repetitive — a reader must never scroll up to learn what a test claims.
- Space response marbles away from action marbles so no two events share a frame — same-frame ordering is a coin flip.
- After writing a marble test, break its expectation once and confirm it fails for the right reason.

Further conventions:

- Import every jest symbol explicitly from `@jest/globals`. No ambient globals, no unused imports.
- Mock every dependency and argument, including a plain module-level `import` — it's a dependency like any other. Assert the
  handover (called, with what, how often) — never what the real collaborator would have done next.
- **Pair every `toHaveBeenCalledWith` with a `toHaveBeenCalledTimes`, and vice versa** — each alone leaves a hole. Use
  `not.toHaveBeenCalled()` for a zero count, never `toHaveBeenCalledTimes(0)`.
- For more than one call on the same mock, assert the whole call log at once (`expect(fn.mock.calls).toEqual([...])`) — covers
  count, arguments and order together.
- `beforeEach` sets the baseline. The first test in a file *is* the baseline case — no extra arrange. Every other test changes
  exactly one precondition in its own arrange step. Shared alterations for several tests go in a nested `describe`'s own
  `beforeEach`, never its body (which runs at collection time).
- **Any complex/mutable fixture shared across a `describe`'s tests is `let` + assigned in `beforeEach`, never `const`** — a
  `const` is one mutable instance reused by reference, and a mutation in one test leaks into the next depending on run order.
  Primitives are fine as `const`.
- **A store's baseline test state is always its own `initialState`, shallow-copied** — never hand-built. A nested `describe` or a
  test's arrange step overwrites only the properties that differ from that baseline.
- Use `toBe` whenever referential equality is the actual claim (e.g. a reducer returning the input state unchanged).
- Prefer test data factories (`src/testing/<name>.factory.ts`, `overrides?: Partial<Type>`) over verbose inline literals once a
  type is used by more than one spec.
- Prefer the tightest true invariant over a type-only check. Write a custom asymmetric matcher when no built-in expresses it; it
  needs its own file and spec once shared across specs — it's logic, not a fixture.
- Write expected values as expressions over the arranged fixtures, not recomputed literals — so the test still passes for the
  right reason when a fixture's value changes, and a reader can verify the assertion from the arrange step alone.
