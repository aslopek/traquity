# LLM.md

This file provides guidance to LLM coding agents (Claude Code, etc.) when working with code in this repository.

## What this directory is

The Electron main process: the desktop shell that owns `traquity.config.json`, resolves Java, spawns the Spring backend jar as a child
process, and opens the `BrowserWindow` on the built Angular app (`../dist/traquity/browser/index.html`). `main.js` is the entry point
named by `package.json`'s `"main"`.

`traquity.config.json` and `traquity.log` both live in `~/traquity/` (`appDataDir` in `main.js`), created once at startup if missing
(`ensureAppDataDir`) — see `architecture/configuration.md` ADR-011 for why the two are kept together and out of the home directory itself.
The downloaded JDK is the one artifact that stays in the app's own working directory instead, per ADR-010.

Paths here are relative to `electron/`, so `__dirname` needs a `'..'` to reach the package root — that is where `dist/`, `resources/` and
`node_modules/` live.

See the parent `LLM.md` for the Angular renderer, and the root `LLM.md` for how the three monorepo parts fit together.

## Module layout

```
electron/
  main.js                      entry point; wiring only, no logic worth testing
  preload.js                   contextBridge surface shared with the renderer
  ai/
    catalogue.js                the curated models, pinned to a Hugging Face revision each; projects the
                                public `CatalogueEntry` shape out of the full internal one
    ai-registry.js              the `ai` key of a loaded config: notice confirmation (re-hashed against the packaged
                                notice resource), which catalogued models are actually installed (verified against
                                the filesystem and the catalogue's own pinned digest), and `install`, which persists
                                a completed download's path
    model-download.js           downloads one catalogue entry from its pinned `resolve/<revision>/<file>` URL into a
                                picked directory, staged then renamed - the AI counterpart of
                                `java/corretto-download.js`, sharing that module's `download/` mechanics but verified
                                by the catalogue's pinned sha256 rather than by a signature
    free-space.js               whether a directory's disk has a required number of free bytes, checked before a
                                model download starts
  download/                    mechanics shared by every streamed download in this app, agnostic of what is being
                               downloaded and of how a completed one is verified (a detached signature vs. a pinned hash) -
                               neither concern lives here
    byte-cap-transform.js      a stream `Transform` that ends the pipeline once a byte cap is passed, enforced
                               on the stream itself rather than on a `content-length` header
    progress-reporter.js       throttled, rolling-window-averaged `downloading`-phase progress, shared by
                               `java/corretto-download.js` and `ai/model-download.js`
    error-message.js           an error's message followed by its `cause` chain, down to a bounded depth - what makes a
                               rejected `fetch` diagnostic at all, since it rejects with the constant message `fetch failed`
                               and names the actual reason only in `cause`
  app/
    restart-into-configuration.js sets `configureOnNextStart`, kills the backend, relaunches and exits, in that order
  config/
    config-schema.js           zod schemas + inferred types for traquity.config.json
    config-file.js             read/write traquity.config.json
    auth.js                    pure scrypt records: create / classify / verify
    auth-registry.js           the auth map over a loaded config, keyed by database base path: classify, verify,
                               record a proven start, list the known databases, remove one entry
    configuration-writer.js    the configuration screen's single config write, one section's slice per config key
    configure-on-next-start.js sets the one-shot `configureOnNextStart` flag and saves the loaded config
  backend/
    backend-reachable.js       poll GET /admin/pid until reachable or child exit
    backend-process.js         spawn, stdin password handover, log piping, single-instance guard, proven-start recording
  java/
    java-path.js               resolve `java` on `PATH`; normalize a picked path to a binary
    java-version.js            async, timeout- and byte-bounded `java -version` run of one absolute path
    java-runtime.js            the boot-time resolution chain and the configuration screen's literal check, both
                               over the two modules above
    jvm-environment.js         the environment every JVM this app spawns is allowed to see
    corretto-public-key.js     the pinned Amazon Corretto release signing key, parsed from its armored form
    corretto-signature.js      parses a detached OpenPGP signature and has `security/verify-hash.js` check it
                               against that key
    corretto-download.js       downloads, verifies and extracts the Corretto 25 JDK, reporting progress
  ipc/
    ipc-schema.js              zod schema for IPC input crossing the renderer boundary
    trusted-sender.js          whether an IPC event came from the main frame of the app's own window
    startup-bridge.js          registers the IPC channels listed below
  security/
    signature-bounds.js        how long a detached signature may be, for every schema that validates one
    tls-override.js            whether `NODE_TLS_REJECT_UNAUTHORIZED` overrides the default, verifying behavior
    verify-hash.js             verifies a detached signature over a file streamed into the hash, format-agnostic
    file-digest.js             digests a file streamed into the hash, no signature involved
  window/
    startup-mode.js            computes the startup mode (`boot` | `configure` | `insecure` | `unlock`) and consumes
                               `configureOnNextStart`
    main-window.js             `BrowserWindow` creation, wired to `preload.js`; `getMainWindow()` exposes it as a
                               dialog parent
    navigation-policy.js       whether a URL may be opened by the OS, and whether the window may navigate to it
    database-dialogs.js        native open/save dialogs for the database file, normalizing to base paths
    java-dialogs.js            native picker for a java binary or its containing directory
    ai-dialogs.js              native directory picker for choosing where a model download lands
  testing/                     shared spec-only helpers (custom matchers, ...) used by more than one *.spec.js
```

The channels `ipc/startup-bridge.js` registers — fourteen request/response via `ipcMain.handle`, two one-way via `ipcMain.on`, two pushes
from the main process into the renderer:

- `startup:getState`
- `backend:start`
- `auth:verify`
- `configure:getState`
- `database:pickExisting`
- `database:pickNew`
- `auth:forget`
- `config:apply`
- `java:verify`
- `java:pick`
- `java:download`
- `ai:getState`
- `ai:confirm`
- `ai:download`
- `app:restartAndConfigure` (one-way)
- `app:quit` (one-way)
- `java:downloadProgress` (push, main → renderer)
- `ai:downloadProgress` (push, main → renderer)

Keep this map current as new channels land — it is what a reader starts from.

## Boot order

`app.on('ready')` loads the config, computes the startup mode (`window/startup-mode.js`), registers the IPC bridge (`ipc/startup-bridge.js`)
and opens the single `BrowserWindow` (`window/main-window.js`). The backend is spawned only when the renderer calls `backend:start` over
that bridge, handled by `backend/backend-process.js`, which resolves with an outcome (`reachable` or not) the renderer routes on.

Java resolution now decides the startup mode rather than running lazily at spawn time: `java/java-runtime.js`'s `resolve()` is kicked off
once, its `Promise<string | null>` held in `main.js` as `javaPromise` and reused by both `window/startup-mode.js` (which yields `configure`
mode when it resolves to `null`) and `backend/backend-process.js`'s `resolveJava`, so a boot-straight-through start probes Java exactly
once. `startup:getState` therefore answers from a `Promise<StartupState>` rather than a plain value - `ipcMain.handle` awaits whatever its
listener returns, so the window opens immediately while the probe runs concurrently with the renderer's own bootstrap. The one thing that
invalidates `javaPromise` is `config:apply`, which reassigns it after saving, since that is the only write able to change `java.path`.

That probe is one place this app runs a binary it did not ship, named by a config file or a file dialog, so
`java/java-version.js` treats it as untrusted and every one of its bounds exists for a reason worth keeping: an absolute path named
`java`/`java.exe` only — relative paths are resolved by the OS against the working directory before any `PATH` lookup, and the name is what
keeps a channel that spawns a JVM from being a channel that spawns anything — no shell and an argument vector, no stdin, the environment
`java/jvm-environment.js` allows, a timeout, and a byte budget across both output streams. Output is read in flowing mode, so nothing but
that budget bounds what a chatty child can make this process accumulate, and V8's ~512 MiB string limit turns into an uncaught `RangeError`
inside a `data` listener when it is reached. Every failure of the run resolves to an `error` verdict, since the promise is created before
`app.on('ready')` and a rejection with no handler yet attached terminates the main process. `java/java-path.js` passes over a relative
`PATH` entry for the same reason rather than letting it become a candidate the probe would then refuse.

`java/jvm-environment.js` is what both JVM spawns — the probe and the backend — pass their environment through, which is what makes it one
rule rather than two: a JVM appends `JAVA_TOOL_OPTIONS`, `JDK_JAVA_OPTIONS` and `_JAVA_OPTIONS` to its own command line, so an inherited
one of those is an inherited argument (`-javaagent:` among them); `LD_PRELOAD`, `LD_AUDIT` and `DYLD_INSERT_LIBRARIES` are the same
substitution one level lower, where the dynamic linker rather than the JVM reads the variable; and `TQ_DB_FILE_PASSWORD` has no business in
a block other processes can read. The backend's spawn sanitizes *after* merging the config file's own `env`, so neither a password nor any
of the above written into the config can come back in through it either.

`NODE_TLS_REJECT_UNAUTHORIZED` set to anything other than `1` (see `security/tls-override.js`) short-circuits all of this: the startup mode
resolves to `insecure` before the auth registry is consulted or `configureOnNextStart` is consumed, `javaPromise` becomes
`Promise.resolve(null)` so no JVM is ever spawned, and the bridge registers only `startup:getState` and `app:quit` - two channels only, so
"nothing can be done" is enforced.

The spawn passes the database password as the entire content of the child's stdin, closed right after, rather than through the child's
environment: the environment carries `TQ_DB_FILE_PASSWORD_STDIN=true` as a marker and no password at all. A few rules govern
that handover, worth knowing before touching `backend-process.js` again: `write`'s boolean return is flow control, not a success/failure
signal; a `drain` wait is registered only after a write returned `false`, never unconditionally; the password buffer is zeroed inside the
write callback, because Node queues the chunk by reference rather than copying it; and the handover never blocks `start` — a child that
never reads its stdin surfaces as a failed start through the existing reachability poll instead of hanging the IPC call.

The preload (`preload.js`) runs in Electron's sandboxed preload context, where `require` is a limited polyfill resolving only `electron`
and a handful of Node built-ins — it cannot `require` a module of this app. That is why the IPC channel names listed above are
literals duplicated in both `preload.js` and `ipc/startup-bridge.js` rather than shared via an import. Nothing checks that the two copies
agree — a renamed channel compiles, passes the suite, and fails only at runtime, so a change to one literal is a change to two files.

The window itself is locked down in `window/main-window.js`, and the two decisions worth arguing about live in `window/navigation-policy.js`
so they can be tested at all (`main-window.js` needs a real Electron and therefore gets no spec). A URL a renderer hands over is **data** —
a release page out of an HTTP response, a link out of the database — so `shell.openExternal` is reached only for `http:`/`https:`, because
every other scheme resolves to whatever the OS registered for it and `file:` resolves to "run this". A navigation away from the app's own
document is refused outright: `contextIsolation` protects the bridge from the page's scripts, not from the page being replaced, and a
window that navigates takes the preload — every IPC channel above — along to wherever it lands. That rule is the top-level frame's:
`will-navigate` does not fire for subframes, and the `will-frame-navigate` that would cover them cannot refuse everything but this
document, because the app embeds the backend's H2 console in an iframe. What a subframe may load is therefore the built document's own
`frame-src`, and `nodeIntegrationInSubFrames: false` is what keeps the preload out of one. Webviews are refused outright, and every
permission request and check is answered `false`, because a portfolio tracker needs no camera, microphone, location or notifications —
device access (WebHID/WebUSB/Web Serial) is decided by `setDevicePermissionHandler`, which those two do not cover, so it is answered
`false` too.

Two decisions in `window/main-window.js` are about what the renderer may *reach out* to rather than about what it may do: `spellcheck` is
off because the renderer displays security names, depot names and imported file contents, and `devTools` is off because a devtools window
inspects the bridge from inside the trusted context. Neither is a default.

Nothing in `webPreferences` may be relaxed without saying which of the above it gives up.

`config/config-file.js`'s `load()` writes nothing, ever. It reports which of three things it observed — `read`, `missing` or `unreadable`
(unparsable JSON, a schema violation, a failed read) — alongside the configuration it hands back, and a file it could not read is left on
disk exactly as it is, with the reason logged to `traquity.log` and nowhere else. `missing` and `unreadable` both mean `configure` mode,
which is the one mode that needs no readable config and spawns no backend. The default configuration `load()` falls back to for either
**names no database at all**: a proposed path is one "Save & start" away from becoming a decision the user never made, so the configuration
screen asks for one instead of inheriting the backend's own built-in default silently.

Every write of that file lands as mode `0600`, and a `chmod` to the same mode follows each one, since a `mode` passed to a write only
applies to a file being created and an install predating this rule still carries whatever umask it was written under.

Five channels write `traquity.config.json`: `auth:forget` removes one `auth` entry immediately, while the screen is still up,
`config:apply` persists the configuration screen on finish, touching `env.TQ_DB_FILE_PATH` and nothing else, `app:restartAndConfigure`
sets `configureOnNextStart` on the way out, `ai:confirm` hashes the packaged AI notice resource and writes that digest as
`ai.confirmedNotice`, initializing `ai.models` to `{}` the first time, and `ai:download` sets one `ai.models[key]` entry on a completed
download. All five reach the disk through a collaborator of their own (`config/auth-registry.js`'s `forget`,
`config/configuration-writer.js`'s `apply`, `config/configure-on-next-start.js`'s `request`, `ai/ai-registry.js`'s `confirm` and `install`);
no `ConfigFile` is injected into the bridge directly, so no other channel can write at all. Nothing in the main process ever *writes* an
`auth` entry outside `recordProvenStart`, which is what keeps "a failed start never discards a record" intact.

A database is identified everywhere by its **base path without extension** — `env.TQ_DB_FILE_PATH`, the `auth` map's keys and
`StartupState.databasePath` are all that shape. The `.mv.db` suffix H2 materializes exists only at the dialog boundary, where
`window/database-dialogs.js` strips it, and in the renderer's presentation, where a pipe re-appends it.

## Structure rule

There is **no integration-test harness for Electron main code**. Everything with logic therefore lives in a module of its own that takes
its I/O dependencies as arguments (file system, `fetch`, timers, the spawned child), and `main.js` is wiring: it constructs the
collaborators, passes the real implementations, and connects them to Electron's `app` events. A piece of logic that can only be reached by
booting Electron is a piece of logic nothing will ever test — that is why the directory looks the way it does.

The flip side is a limit on what a green suite proves here: it says nothing about whether the packaged app actually starts. Wiring,
`__dirname` resolution, resource paths and dependency pruning are all outside its reach. Never report a main-process change as verified on
a passing suite alone — say which part still rests on a packaged run.

## Type safety — JSDoc over checked JavaScript

Electron loads `main.js` directly, so these files are CommonJS rather than TypeScript. That is a constraint on the *syntax*, not on the
type checking: **every file under `electron/` is fully type-checked by `tsc` in strict mode, with all types expressed as JSDoc**.
`tsconfig.electron.json` is the single switch (no `// @ts-check` pragmas in the files), and it covers `*.spec.js` as well. Untyped
JavaScript is not an accepted state anywhere in this directory: no `any` in any form, no `@ts-ignore`, no `@ts-nocheck`. `@ts-expect-error`
is allowed only in a spec that deliberately asserts a type error, with a comment naming which one.

Why the overrides in `tsconfig.electron.json` are what they are — none of this should be "cleaned up" later:

- **`module`/`moduleResolution: node16`** — the base config's `ES2022` + `bundler` is rejected together with CommonJS and would mistype
  `require`. `package.json` has no `"type"` field, so `node16` correctly treats these files as CJS.
- **`lib: ["ES2023"]`, no `DOM`** — the main process has no DOM, so `document`, `window` and `localStorage` fail to compile here instead of
  failing at runtime. `fetch`, `Response` and friends come from `@types/node`.
- **`noUncheckedIndexedAccess`** — makes an index access carry `| undefined`, which is what turns "a database with no `auth` entry is
  pending" into something the compiler enforces rather than something a doc asserts.
- **`exactOptionalPropertyTypes`** — an optional property may be absent, but not present-and-`undefined`. Build option bags by omission
  (`{...(logger ? {logger} : {})}`), not by assigning `undefined`; where a property genuinely means "explicitly not set", declare it as
  `@property {X | undefined} [key]` rather than reaching for the flag.
- **`strict`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`** are inherited from the base config.
  Keep them.

JSDoc rules:

1. **Every exported function has a complete signature** — one `@param {Type} name` per parameter, one `@returns {Type}`. `@param {Object}`
   and `@returns {*}` are not types.
2. **Every internal data shape is a named `@typedef`**, declared once in the module that owns it: option bags, injected-dependency shapes,
   return objects. Import them across files with `@import {X} from './y.js'` next to the `require` calls — never re-declare.
3. **Model states as unions and literal types**, not as loose objects and `string` (`@typedef {'pending' | 'passwordless' | 'scrypt'}
   AuthState`), so classifying becomes a narrowing operation.
4. **Injected dependencies get a minimal declared type** — the same principle the parent `LLM.md` states for selectors. A module needing
   three `fs` functions declares exactly those three (see `ConfigFileSystem`), rather than depending on the whole module type. The real
   dependency is structurally assignable to it, and — the actual payoff — so is a test stub made of exactly that many `jest.fn()`s, with no
   cast anywhere. A stub missing one is a compile error. This holds just as much for **this app's own collaborators** as for a third-party
   module: an injected `ConfigFile`, `AuthRegistry` or `BackendProcess` is declared as a `Pick<>` of the members the module actually calls
   (`Pick<ConfigFile, 'save'>`), never as the whole exported typedef. Naming the whole type costs nothing at runtime and everything in a
   spec — the stub then has to carry members the module cannot reach, and a reader of that spec is left wondering which of them the
   behavior depends on.
5. **Type assertions** are written `/** @type {X} */ (expression)`, parentheses required, and only where no parser can help (a dynamic
   `require`). Never assert to `any`.
6. **Constant objects use `@satisfies`**, which checks the shape without widening the literal types away.
7. **Electron and Node types come from the real packages**: `/** @type {import('electron').BrowserWindow | null} */`,
   `/** @type {import('node:child_process').ChildProcessWithoutNullStreams | null} */`.
8. Document *meaning* in prose only where the type cannot carry it (encodings, units, "base path without extension"). A comment restating
   the type is noise. **A comment naming the module's callers is worse than noise** — see the root `LLM.md`, "Dependency inversion binds
   the docs too". A module here documents its own contract (the channel it serves, what it writes, what it returns); which part of the
   boot order reaches it, and why, is documented in the boot order above, not in the module.

## The zod boundary rule

**Anything arriving from outside the program — disk, IPC, the network, a subprocess — is defined exactly once, as a zod schema, with its
static type inferred from that same schema via `z.infer`.** A hand-written `@typedef` for such a shape is an *assertion about* the data
while the validating code is a *separate* piece of logic; nothing keeps the two in agreement, and they drift the moment a key is added.
`JSON.parse` returns `any` and is the one real hole in checked JS: its result goes straight into a `safeParse` and never flows on untyped.
Do not hand-roll a type predicate for it either.

`config/config-schema.js` owns every schema and every exported type for `traquity.config.json`. Later keys (`configureOnNextStart`,
`java`) extend that one file rather than adding parsers of their own, and every consumer's static type follows automatically.

**Everything your own code constructs stays a `@typedef`.** The test for a new type: *does a value of this shape ever arrive from disk,
IPC, the network or a subprocess?* Then zod. Otherwise `@typedef`. Reasons this is a line rather than a preference, so it does not get
re-litigated:

- Shapes constructed three lines earlier (`ConfigFileOptions`, `BackendStartOutcome`, `AuthState`) have no untrusted input to validate. A
  schema for them runs at every call for a check that cannot fail, and buys a type a one-line `@typedef` already states.
- The injected-dependency types **cannot** be zod: `ConfigFileSystem` is a bag of functions, `z.function()` in zod 4 is a function factory
  rather than a schema and cannot be a field in `z.object()`, and validating a function at runtime would be meaningless anyway. That
  typedef exists so a drifted *test stub* fails `tsc` — which is the right time to fail.
- A schema must read as a **signal**. Where zod appears, a reader concludes "untrusted input arrives here". Spread over internal shapes, it
  stops carrying that meaning while the real boundaries blend in.

Two rules the config schemas specifically depend on: an entry map is validated **per entry**, so one mangled entry makes that entry
unusable rather than throwing away the whole file; and the semantic checks that protect a *call* (resource bounds around `scryptSync`) stay
in the calling module, not in the schema — zod answers "is this shaped like a record", not "is this safe to run".

Every string in `ipc/ipc-schema.js` carries a maximum length, and the bound is about the receiving side rather than about what a user would
type: a password is run through scrypt, a path is spawned or written to the config file. The renderer is not the trustworthy source it
looks like — it renders what a database and an HTTP response contain — so a new field there gets a bound like the others.

One check runs *before* any of those schemas: `ipc/trusted-sender.js` decides whether the event's sending frame is the main frame of the
app's own window, and `ipc/startup-bridge.js` registers every channel — the two one-way ones included — behind it. A registration is per
channel name rather than per frame, so which frame an event came from is a question only the event answers, and the answer is an identity
comparison against an object this process created rather than a check on a URL the sender influences. A refused `handle` throws (the
renderer sees a rejected `invoke`, the same shape a rejected argument takes); a refused `on` is dropped, since there is no answer to
reject. Adding a channel means adding it through the module's own `handle`/`on` helpers, never through `ipcMain` directly.

## Runtime dependencies

`package.json`'s `dependencies` block is the main process's. Anything the main process `require`s statically belongs there and **not** in
`devDependencies`: electron-packager prunes dev dependencies out of the packaged app.

A package added to `dependencies` ships to users, and `scripts/generate-third-party-licenses.js` picks it up from that block on its own —
attribution is not something to remember here. Its license still has to pass `npm run licenses:check` and the root `LLM.md`'s licensing
rule. The reverse direction is the one that needs care: a package required only by a spec stays a `devDependency` (`expect`, used by
`testing/base64-of.js`, is the example) and must never be moved into `dependencies` to make something resolve — that would ship a test
library to users and put it in the license report.

## What of this directory ships

`forge.config.js`'s `packagerConfig.ignore` is an **allowlist**: `package.json`, `electron/`, `dist/traquity/browser/` and
`node_modules/` go into `app.asar`, and everything else in the package directory — the Angular sources, the build tooling, a second copy of
`backend.jar` (it is already delivered as an `extraResource`) — does not. A file added anywhere else therefore ships only once someone says
so, instead of shipping because nobody looked.

Within `electron/`, three things are carved back out: `*.spec.js`, everything under `testing/`, and the `*.md` files. Test code in a
shipped app cannot even load — its dependencies are pruned away with the other devDependencies — and its only remaining effect would be to
suggest a test library is part of the product. Keep new spec-only helpers under `testing/` so they stay covered by that rule.

Note that a function-valued `ignore` *replaces* electron-packager's built-in default patterns rather than extending them, which is why
`node_modules/.bin` is excluded explicitly. Anything else worth keeping out of the package belongs in the same list.

`forge.config.js` also flips a set of Electron **fuses** into the packaged binary, and they matter to everything in this directory: the
binary otherwise accepts `ELECTRON_RUN_AS_NODE=1`, `NODE_OPTIONS=--require=…` and `--inspect`, each of which runs code in the main process
without `main.js` ever being consulted — which is to say, past the preload boundary, the IPC schemas and the bounded java probe alike, all
at once. `OnlyLoadAppFromAsar` belongs to the same list because Electron otherwise prefers an unpacked `app` directory next to `app.asar`.
`GrantFileProtocolExtraPrivileges` is deliberately left on: this app's own document *is* a `file:` URL. A fuse is a property of the
packaged binary, so none of this is observable from the suite — it is verifiable only on a packaged run.

## Testing

Specs are `electron/**/*.spec.js`, plain CommonJS, run by `jest.electron.config.ts` via `npm run test:electron` — which type-checks the
directory first, so a type error fails fast instead of surfacing as a confusing runtime failure. The suite needs nothing but `npm ci`: no
Angular build, no generated API clients, no backend jar, no Java.

The shared conventions from the parent `LLM.md`'s Testing section apply unchanged — explicit `@jest/globals` imports, `beforeEach`
establishes the baseline, the first test in the file *is* the baseline case, every other test changes exactly one precondition in its own
arrange step, shared alterations live in a nested `describe`'s own `beforeEach`, mocks over real dependencies, and every
`toHaveBeenCalledWith(...)` paired with a `toHaveBeenCalledTimes(n)` and vice versa — or, for more than one call,
`expect(fn.mock.calls).toEqual([...])` covering count, arguments and order in one literal, as
`java/corretto-download.spec.js` does for the three `rmSync` calls a download makes. What is specific here:

- `jest.electron.config.ts` sets `injectGlobals: false`, because jest's injected `jest` wrapper argument collides with the explicit
  `const {jest} = require('@jest/globals')` in a CommonJS file. Import every jest symbol; there are no ambient globals to fall back on.
- The same config sets `transform: {}`, and that changes how `jest.mock()` has to be written here: **nothing hoists it**. Babel-jest is
  what normally lifts a `jest.mock(...)` call above the imports, and it does not run in this directory, so the call has to physically
  precede the `require` of the module under test — otherwise that module has already captured the real collaborator and the mock silently
  does nothing. `java/corretto-signature.spec.js` is the worked example.
- The parent `LLM.md`'s custom-asymmetric-matcher convention applies here too, with `electron/testing/` standing in for `src/testing/` as
  the shared location (there is no `src/` in this directory) — see `testing/base64-of.js` for the worked example: a class extending
  `expect`'s `AsymmetricMatcher`, JSDoc-typed like everything else here, with its own `base64-of.spec.js`.
- Specs are type-checked like everything else. Declare the mock functions standalone, assemble them into the declared dependency type, and
  assert on the standalone bindings:

  ```js
  const existsSync = jest.fn(() => true);
  const readFileSync = jest.fn(() => storedContents);
  const writeFileSync = jest.fn();

  /** @type {ConfigFileSystem} */
  const fileSystem = {existsSync, readFileSync, writeFileSync};
  ```

  Reaching for `/** @type {any} */` on a stub means the stub and the real dependency have diverged — fix the stub.
- A stub that stands in for something asynchronous must model *waiting*, not just resolving. A `delay` stub resolving immediately turns a
  poll loop into a microtask spin that starves the event loop; return a promise that stays pending instead.
- **The specs and the shipped app do not run on the same crypto.** `npm run test:electron` runs under plain Node, which statically links
  its own OpenSSL; the packaged app runs under Electron, which builds Node against Chromium's BoringSSL instead (`process.versions.openssl`
  reads `0.0.0` there — that is the tell). Both are bundled into the respective binary, identically on Windows, macOS and Linux, so this is
  a *runtime* difference and never a platform one: no system `libssl` is ever involved.

  Anything here touching `node:crypto` therefore carries a gap no spec can close. Code that relies on a rule enforced *inside* one of those
  libraries must **degrade rather than throw** when the other one disagrees — `config/auth.js` is the worked example: its resource bounds
  mirror scrypt's own parameter validation so a hand-edited record classifies as pending, and the derivation is additionally guarded so an
  unanticipated rejection reads as "does not verify" instead of escaping into the startup path. To settle an actual disagreement, probe the
  shipped runtime directly: `ELECTRON_RUN_AS_NODE=1 npx electron <script>` runs any script under Electron's own Node and crypto.
