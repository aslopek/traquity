# LLM.md

Guidance for LLM coding agents (Claude Code, etc.) working in this directory.

## What this directory is

The Electron main process: owns the config file, resolves Java, spawns the Spring backend jar as a child process, opens the
window on the built Angular app. `main.js` is the entry point.

Config and log file live in the user's dir, created at startup if missing. The downloaded JDK stays in the app's own
working directory.

Paths here are relative to `electron/` — `__dirname` needs a `'..'` to reach the package root.

See the parent `LLM.md` for the renderer, the root `LLM.md` for how the three monorepo parts fit together.

## Running a model

Model loading/catalogue/registry/download code is usecase-agnostic; one module takes the usecase as a parameter and is the only
place a model is loaded and prompted. A usecase adds: a packaged prompt directory, and a subdirectory holding the grammar its
answers decode under and the schema they're parsed with. Only prompts are packaged files — a grammar is generated per request.

Non-obvious points:

- **The inference lock is per process, never per usecase** — the machine holds one model's weights at a time. Nothing queues; a
  generation holds a model and context for seconds to minutes.
- **A model loads in the main process, not a utility process.** The library's own GPU-binary probe mis-detects Electron and
  forks a second copy of this app in a packaged build instead of a lightweight probe process. Nothing in the suite catches a
  regression here — it shows up as a flashing window on a packaged run.
- **A thinking model's answer is not in the plain response-text field** — under a grammar, every token belongs to the answer, so
  the whole thing lands in the thought segment and the plain field comes back empty. Use the dedicated response-text extractor.
- **Context size is sized to the prompt, and GPU/CPU layer split follows from that** — never the reverse. A context that merely
  almost fits silently truncates the top of the prompt. Fitting is an estimate and can still fail at context-creation time; that
  retries down a fallback ladder moving layers off the GPU. The context size itself never moves.
- **`dispose` is the only thing that releases model/context weights.** Any new code path must dispose on every exit, or it leaks
  for the life of the process.

## Transaction extraction

One transaction read out of one already-parsed broker document.

- The channel takes an **already extracted** document plus the tokens the renderer read off it, the target currency, and the
  model key. Nothing is written to the config file.
- Failures are logged in full (document text, grammar, prompt, raw answer, parse failure, stop reason) — the user only ever sees
  a generic "could not extract" message, since these failures aren't user-debuggable from the screen.
- **The model sorts, and states no value.** Every answer field is a token id resolved back to a value the renderer already
  read; the model never reads a number, date or time itself. A value the renderer's own parsers missed has no id, so the fix
  belongs in the renderer's PDF parsing, never in the grammar or the prompt.
- **The ISIN is no part of the model's answer** — it's determined deterministically, not asked for.

## Boot order

- `app.on('ready')` loads the config, computes the startup mode, registers the IPC bridges, and opens the single window. The
  backend spawns only when the renderer calls the start channel, and resolves with a reachability outcome the renderer routes
  on.
- **Java resolution runs once, eagerly, not lazily at spawn time** — its promise is shared by startup-mode computation and the
  backend spawn, so a straight-through boot probes Java exactly once. Saving a new Java path is the only thing that re-triggers
  resolution.
- The machine capability probe is held the same way — kicked off once, re-read on every query, never persisted, so a changed
  machine is picked up on the next start without ever writing a stale verdict to disk.
- **The Java probe runs an untrusted binary** (named by a config file or a file dialog) — treat every bound here as load-bearing:
  absolute path to `java`/`java.exe` only (never a relative lookup through `PATH`), no shell, a fixed argument vector, no stdin,
  a restricted environment, a timeout, and an output byte budget. Every failure resolves to an explicit error verdict.
- Both JVM spawns (probe and backend) share the same environment-sanitizing step, which strips JVM-affecting and
  dynamic-linker-affecting variables (`JAVA_TOOL_OPTIONS`-style injection points, `LD_PRELOAD`/`DYLD_INSERT_LIBRARIES` and
  equivalents) and the DB password — applied *after* merging the config file's own `env`, so nothing written there can smuggle
  any of this back in.
- Setting `NODE_TLS_REJECT_UNAUTHORIZED` to anything other than `1` short-circuits startup into an insecure mode before the auth
  registry or any config mutation runs: no JVM is ever spawned, and only the bare minimum IPC surface (state query, quit) is
  registered.
- **The DB password goes to the backend over stdin, never the environment** — the environment only carries a marker flag.
  Closing that stream is the shutdown request. Rules for touching this code: zero the password buffer right after the write
  (Node queues it by reference); never let the handover block the start call (a non-responsive child surfaces through the
  reachability poll, not a hang); shutdown closes stdin, waits for exit, then force-kills after a timeout. Every quit path
  awaits shutdown before continuing — including the case of an orphaned child, which still gets EOF once its parent's handles
  are reclaimed.

## IPC channels and the preload

- IPC bridges register channels through a shared trusted-channel wrapper; the preload exposes them as `contextBridge` globals.
- **The preload cannot `require` this app's own modules** — every channel name is therefore a literal duplicated between the
  preload and whichever bridge registers it. Nothing checks the two copies agree: a rename compiles, passes the suite, and
  fails only at runtime. Changing a channel name means changing it in both places.

## The window

- A URL the renderer hands over is **data**, not a trusted navigation target — only open `http:`/`https:` externally; every
  other scheme resolves to whatever the OS or this app's own webview stack would do with it.
- **Top-level navigation away from the app's own document is refused outright** — `contextIsolation` protects the bridge from
  page scripts, not from the page being replaced, and a navigated window takes every IPC channel with it. Subframes get their
  own, narrower allowance, because the app embeds the backend's H2 console in an iframe.
- Webviews are refused outright. Every permission request (camera, mic, location, notifications, device access) is answered
  `false` — a portfolio tracker needs none of them.
- Spellcheck is off (the renderer displays untrusted names/content) and devtools are off (a devtools window can inspect the
  bridge from inside the trusted context). Neither is a default — both are explicit.
- Never relax anything in the window's web preferences without stating which of the above it gives up.

## The config file

- The config loader **never writes**. It reports what it observed (read / missing / unreadable) alongside whatever it hands
  back; an unreadable file is left on disk untouched, with the reason logged only to the log file. Missing or unreadable both
  mean "show the configure screen".
- The built-in default configuration names **no database at all** — a proposed path is one click away from becoming a decision
  the user never made, so the configure screen always asks.
- Every write to the config file is mode `0600`.
- A small, fixed set of IPC channels is allowed to write the config file, each through its own dedicated collaborator — no
  channel handler is ever given direct write access to the config file itself. Nothing in the main process writes an auth
  entry outside the one function that records a proven start — a failed start must never discard an existing record.
- A database is identified everywhere by its **base path without extension**. The on-disk file suffix only ever appears at the
  file-dialog boundary and in the renderer's own presentation layer.

## Structure rule

There is **no integration-test harness for Electron main code**. Every module with logic takes its I/O dependencies (file
system, `fetch`, timers, the spawned child) as arguments; `main.js` is wiring only — it constructs collaborators, passes real
implementations, and connects them to Electron's `app` events. Logic reachable only by booting real Electron is logic nothing
will ever test.

A green suite says nothing about whether the packaged app actually starts — wiring, path resolution, and dependency pruning are
outside its reach. Never report a main-process change as verified on a passing suite alone; say which part still rests on a
packaged run.

## Type safety — JSDoc over checked JavaScript

Electron loads `main.js` directly, so these files are CommonJS, not TypeScript — that constrains syntax, not type checking.
**Every file under `electron/` is fully type-checked by `tsc` in strict mode, with all types expressed as JSDoc.** No `any` in
any form, no `@ts-ignore`/`@ts-nocheck` anywhere. `@ts-expect-error` is allowed only in a spec deliberately asserting a type
error, with a comment naming which one.

JSDoc rules:

1. Every exported function has a complete signature — one `@param {Type} name`, one `@returns {Type}`. `@param {Object}` and
   `@returns {*}` are not types.
2. Every internal data shape is a named `@typedef`, declared once in the module that owns it, imported elsewhere — never
   re-declared.
3. Model states as unions/literal types, not loose objects and `string`.
4. **Injected dependencies get a minimal declared type** — a module needing three `fs` functions declares exactly those three.
   The payoff: a test stub missing one member is a compile error, with no cast anywhere. This applies to this app's own
   collaborators too, declared as a `Pick<>` of only the members actually called — never the whole exported type.
5. Type assertions are `/** @type {X} */ (expression)`, only where no parser can help. Never assert to `any`.
6. Constant objects use `@satisfies`, which checks shape without widening literal types away.
7. Electron/Node types come from the real packages (`import('electron').BrowserWindow`, etc.).
8. Document meaning in prose only where the type can't carry it. A comment restating the type is noise; a comment naming the
   module's callers is worse than noise (root `LLM.md`, dependency inversion). Document a module's own contract — not which
   part of the boot order reaches it.

## The zod boundary rule

**Anything arriving from outside the program — disk, IPC, the network, a subprocess — is defined exactly once, as a zod schema,
with its static type inferred from that schema.** A hand-written typedef for such a shape is just an assertion about the data;
nothing keeps it and the validating code in agreement. `JSON.parse` output goes straight into a `safeParse`, never flows on
untyped, and never gets a hand-rolled type predicate instead.

**Everything your own code constructs stays a plain typedef.** The test: does a value of this shape ever arrive from disk, IPC,
network or a subprocess? Then zod. Otherwise typedef — in particular, injected-dependency bags of functions can't be zod at all
(a function field can't be validated meaningfully), and a schema over internally-constructed shapes dilutes zod's signal that
"untrusted input arrives here".

- Validate an entry map **per entry**, so one mangled entry doesn't take down the whole file.
- Semantic checks protecting a call (e.g. resource bounds around a crypto call) stay in the calling module, not the schema —
  zod answers "is this shaped right", not "is this safe to run".
- Every string accepted over IPC carries a maximum length, sized to the receiving side (what it's spawned into, hashed with, or
  written to) — the renderer is not a trustworthy source; it renders whatever a database or an HTTP response contains.
- One check runs before any schema: every registered channel verifies the event's sending frame is the app's own main frame,
  not a URL-based check. Register new channels only through the shared trusted-channel wrapper, never `ipcMain` directly.

## Runtime dependencies

- Anything the main process `require`s statically belongs in `dependencies`, never `devDependencies` — packaging prunes dev
  dependencies out.
- A package required only by a spec stays a `devDependency` and must never move to make something resolve — that ships a test
  library to users.
- The local-inference library is ESM-only and loaded via dynamic `import()`; its native addon ships as an unpacked,
  per-platform optional dependency so the OS loader can resolve its shared libraries on a real filesystem.

## What of this directory ships

- Packaging uses an **allowlist**, not a denylist — only `package.json`, `electron/`, the built Angular output, and
  `node_modules/` go into the packaged app.
- Within `electron/`, specs, test-only helpers, and markdown files are carved back out — test code can't even load in a
  packaged app (its deps are pruned) and would otherwise suggest a test library ships with the product.
- Packaging also locks a set of Electron fuses — these block known ways to run arbitrary code in the main process
  (`ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS`, `--inspect`, loading an unpacked app next to the asar) that would otherwise bypass
  the preload boundary, the IPC schemas, and the sandboxed Java probe entirely. None of this is observable from the test suite
  — only from a packaged run.

## Testing

Electron specs are plain CommonJS, run by a dedicated jest config that type-checks the directory first. The suite needs nothing
but a clean install — no Angular build, no generated clients, no backend jar, no Java.

The parent `LLM.md`'s testing conventions apply unchanged. Specific to this directory:

- The jest config disables global injection — import every jest symbol explicitly; `jest.mock` colliding with an explicit
  import otherwise breaks.
- The same config disables the transform that normally hoists `jest.mock()` calls — write the mock call **before** the
  `require` of the module under test, or the module has already captured the real collaborator.
- The custom-asymmetric-matcher convention applies here too, with its own `testing/` folder standing in for the renderer's.
- Declare mock functions standalone, assemble them into the declared dependency type, and assert on the standalone bindings —
  a stub typed `any` means the stub and the real dependency have diverged; fix the stub instead.
- A stub standing in for something asynchronous must model *waiting*, not just resolving immediately — an immediately-resolving
  delay stub turns a poll loop into a microtask spin that starves the event loop.
- **Specs and the shipped app run on different crypto backends** (plain Node's OpenSSL vs. Electron's bundled BoringSSL) — this
  is a runtime difference, not a platform one. Code relying on a rule enforced *inside* one of those libraries must degrade
  instead of throwing when the other disagrees. To settle an actual disagreement, probe the shipped runtime directly
  (`ELECTRON_RUN_AS_NODE=1 npx electron <script>`).
