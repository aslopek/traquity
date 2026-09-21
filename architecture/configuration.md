# Configuration

The ADRs in this file deal with the configuration of Java and the database which are required before fully booting the app. "Settings",
which can be chosen once the app has fully booted, are not part of this.

## ADR-001: Startup screens live in the Angular app; the backend spawn becomes IPC-triggered

**Status:** ACCEPTED

**Context:** The setup and unlock screens need real UI (theming, validation, progress) before the backend exists. Options: (a) separate
lightweight HTML pages bundled with the Electron shell, (b) the existing Angular app, told which startup mode applies. The app shell
already renders a splash screen until `backendAvailable()`; the database-management plan already introduces the preload/IPC bridge.

**Decision:** One `BrowserWindow`, always loading the built Angular app. `main.js` computes a **startup mode** — `configure` (no config
file, or `configureOnNextStart` set), `unlock` (selected DB has or awaits a password hash), `boot` (passwordless) — and exposes it via
the IPC bridge. The app shell renders the matching screen before its normal chrome. The backend is **no longer spawned before the
window**: the renderer triggers it exactly once via a `backend:start` IPC call (with the password when there is one), after
setup/unlock completes — or immediately in `boot` mode.

**Consequences:**

- "Finish setup → normal process continues" needs **no app relaunch**: env vars are fixed at spawn time, and in `configure` mode the
  spawn simply hasn't happened yet. The window transitions from setup → (unlock →) splash → app.
- A second UI stack (option a) is avoided; screens get Material theming, Signal Stores, and the existing splash for free.
- The Angular app must not fire its initial global-store loads while in `configure`/`unlock` mode (they would 404 against a
  not-yet-spawned backend; today the splash already tolerates this by polling).
- In browser dev mode (`ng serve`, no bridge) the shell behaves exactly as today: no startup screens, splash until the separately
  started backend responds.

## ADR-002: Per-database `auth` entry (scrypt salt + hash, or explicit `passwordless`) replaces `askForPassword`

**Status:** ACCEPTED

**Decision:** `traquity.config.json` replaces `askForPassword` with `auth`, keyed by DB base path like before. The block below is
the epic's *complete* config surface — `auth` (this ADR, story #34), `configureOnNextStart`
(ADR-006, stories #37/#39) and `java` (ADR-005, story #38); each key is introduced independently, so the stories can land in any
order:

```json
{
  "env": {"TQ_DB_FILE_PATH": "C:\\Users\\x\\traquity"},
  "auth": {
    "C:\\Users\\x\\traquity": {"scrypt": {"salt": "<base64>", "hash": "<base64>", "cost": 16384, "blockSize": 8, "parallelization": 1}},
    "D:\\backup\\traquity-test": {"passwordless": true}
  },
  "configureOnNextStart": false,
  "java": {"path": null}
}
```

- Hashing uses Node's built-in `crypto.scryptSync` — no new dependency, memory-hard, available in the Electron main process.
  Parameters are persisted per entry so they can be raised later without breaking existing entries.
- "No password" is an **explicit marker** (`passwordless: true`), not a hash of the empty string — the unlock screen can be skipped
  without any computation, and an empty-string hash would confirm the absence of a password to anyone reading the file anyway.
- A database with **no `auth` entry at all** means "password state unknown / hash pending" — the unlock screen asks, and the hash is
  captured per ADR-003.
- No migration of existing configs is performed. `askForPassword` is simply no longer read; an upgraded config has no
  `auth` key, so every database reads as pending and the pending path handles it. The cost is one prompt per database on the first
  start after the upgrade — including for a formerly `askForPassword: false` one — after which ADR-003 has captured the entry and the
  behavior is as before. A leftover `askForPassword` key is inert.

## ADR-003: A hash is only recorded after a proven-successful backend start; a failed start never discards one

**Status:** ACCEPTED

**Context:** The hash must describe the password that *actually decrypts the H2 file*, not merely what the user typed. And the file's
real password can change outside the app (H2 tools, restored backup), making a stored hash stale.

**Decision:** salt+hash (or `passwordless`) for a pending database is persisted only once the backend spawned with that password has
demonstrably started. That signal is sound rather than a heuristic: Liquibase runs during context refresh and takes a real JDBC
connection, which is where H2 validates the file password — so a reachable HTTP port *proves* the file was decrypted with exactly that
password. The main process therefore polls `GET /admin/pid` on the spawned child itself (the renderer's `waitForBackend()` poll stays
where it is; the config write must not depend on the renderer).

Conversely, a **failed** start never clears an entry. The failure is unclassifiable from the main process — a re-encrypted file, an
occupied port, a broken jar and a dead Java all look like "exited without becoming reachable" — so clearing on suspicion would destroy
a good record over an unrelated failure and send the user to retype a password that was never wrong. Instead the app routes on the
state it started from, and only an explicit user action discards a record:

| Started from                                          | Destination on a failed start          | `auth` entry |
|-------------------------------------------------------|----------------------------------------|--------------|
| pending (no entry, password typed blind)              | unlock screen with an error            | stays absent |
| verified `scrypt` record                              | configuration screen, failure surfaced | untouched    |
| `passwordless` (`boot` mode, no unlock screen exists) | configuration screen, failure surfaced | untouched    |

The configuration screen offers "Forget the remembered password" (story #37), which is the sole path back to pending. Routing to
`configure` mode happens in-session and does **not** write `configureOnNextStart` (ADR-006 stays start-time and one-shot); it is the
same pattern ADR-005 already applies to failed Java resolution. The stored hash remains a cache of truth owned by the H2 file — never
the other way around.

## ADR-004: Security trade-off of storing a password hash on disk

**Status:** ACCEPTED

Storing a scrypt salt+hash in `traquity.config.json` gives anyone with file access an offline-guessing target. Accepted, because:
the attacker with access to the config also has access to the `.mv.db` itself, which is *already* an offline target for password
guessing (H2 file encryption); also the salting increases an attackers' cost for guessing.

## ADR-005: Java is configured, not interrogated — `java.path` in the config, download moved into the setup UI

**Status:** ACCEPTED

**Decision:** The config gains `java.path`, and a start resolves Java in two steps with the setup screen as its last resort: use
`java.path` if it points at a runnable `java`; otherwise use `java` from the `PATH`; if neither runs, fall into `configure` mode with the
Java section carrying the resolution error — no more blocking native message boxes at boot. `null`, `undefined` or an absent `java` key
skips straight to the `PATH` step.

A `java.path` that stopped working therefore does **not** stop the app: the common causes (an in-place JDK upgrade, a moved directory) are
exactly the ones where a working `PATH` makes an interruption pointless. The price is that the config may name a runtime the app is not
using, and the fallback never rewrites it. The setup screen is where that gets reported: it verifies the *literal* setting rather than
mirroring the boot fallback, so a stale `java.path` shows as an error and blocks "Save & start" even where the app boots fine.

The setup screen owns everything currently done by `verifyJava()`'s dialogs: show what would be used (`java -version` output), let the user
pick a local JDK/JRE (native dialog, validated by actually running `-version`), or download Corretto 25 with a visible progress bar and the
existing GPLv2+CE license note. The download keeps the no-shell `spawnSync` extraction and today's Windows/macOS target — `java` in the
app's working directory — on all three platforms; only Linux moves onto it, off a `~/.traquity/java` dotdir that nothing else in the app
uses. A repeated download replaces whatever is already there. Nothing relative is ever persisted: `path.resolve` yields an absolute path
and that is what `java.path` records, so an app directory that later moves breaks the recorded path exactly like a deleted JDK does, and
the chain above already routes it.

That location is a download *target*, not a resolution step: nothing probes it. A downloaded runtime becomes reachable because `java.path`
is set to it, and — like every other pending change in the screen — that happens on "Save & start" and not before (ADR-006, story #37).
"Discard & start" straight after a download consequently leaves ~200 MB that no start resolves to. Accepted: re-picking it costs two
clicks, since the native dialog opens at the download target, and re-downloading overwrites rather than duplicates.

## ADR-006: `configureOnNextStart` is a one-shot flag

**Status:** ACCEPTED

Set to `true` by the Settings action (story #39) and **consumed at start**: `main.js` reads it to force `configure` mode and removes it
from the config in the same step, before the window renders anything (story #35). The flag is therefore already gone while the
configuration screen is up — the screen never reads or writes it, and no way of leaving the screen (finishing, discarding, closing the
window, a crash) can leave it dangling or loop the app back into setup.

That is one step earlier than "cleared when the screen is finished or cancelled", and deliberately so: clearing it on the way *out* makes
every exit path responsible for it, and the one path nobody codes for — the app dying in the screen — is exactly the one that would trap
the user in a permanent setup loop.

Leaving the screen is therefore purely a routing decision, offered by two buttons that both continue the startup (story #37):
"Save & start" persists the changes first, "Discard & start" drops them and continues with the config as it was. "Discard & start" is
always shown, but disabled on a true first run — there is no previous config to continue with, so the only way forward is finishing the
setup; closing the window quits.

## ADR-007: `custom-electron-prompt` is removed entirely

**Status:** ACCEPTED

The unlock screen (story #36) replaces the dependency's only use. Removal includes the `require` from `resourcesDir/node_modules`, the
packaging of that module into `resources/`, and its entry in the generated third-party license report. No replacement prompt library —
password input is a first-class app screen.

## ADR-008: The password is handed to the backend via stdin; the env variable becomes a dev-mode-only channel

**Status:** ACCEPTED — the wire format (EOF-terminated, no delimiter) is superseded by ADR-012. The channel choice itself (stdin over the
environment) still stands.

**Context:** `TQ_DB_FILE_PASSWORD` in the child-process environment is readable by every same-user process for the backend's whole
lifetime (Linux `/proc/<pid>/environ`, Windows PEB reads, macOS `ps -wwE`) and is routinely captured by crash/heap dumps and support
tooling. It is the last leg where the plaintext password sits somewhere broadly observable.

**Decision:** The Electron spawn (story #35's `backend:start`) omits the variable, sets a `TQ_DB_FILE_PASSWORD_STDIN=true` marker, and
writes the password (nothing at all for passwordless databases) to the child's stdin, then closes the stream. On the backend, an
`EnvironmentPostProcessor` reads stdin to EOF — only when the marker is set — and contributes `TQ_DB_FILE_PASSWORD` as a property
source with precedence over the system environment, before datasource/Liquibase initialization. The placeholder in `application.yaml`
stays untouched, which makes the priority rule structural: a stream that reached EOF is a completed handover and always wins, and
whenever no password arrives via stdin — no marker (standalone `mvn spring-boot:run`, `dev-file` profile), or marker set but the
stream never closing until the read timeout fires — nothing is contributed and the env-variable path works exactly as today, so dev
mode keeps functioning unchanged.

The wire format is part of the decision, because both ends have to agree byte for byte: **UTF-8 bytes, no delimiter, terminated by
EOF**, written through a pipe with no shell in the chain and decoded on the backend as UTF-8 explicitly rather than via the platform
or console default. **EOF rather than a newline** because a delimiter has to be excluded from the password again, and every such rule
is a silent-lockout bug waiting to be introduced by a later cleanup — a `trim()` eating a legitimate trailing space, a `\r` handled or
not handled. With EOF there is no rule to get wrong: the bytes are the password verbatim, any password travels including one
containing a newline, and neither the unlock screen (#36) nor the configuration screen (#37) inherits a constraint on what it may
accept.

Two consequences of EOF-delimiting are deliberate. **Zero bytes mean an explicit empty password**, not a missing handover: the two are
indistinguishable without a delimiter, and in the packaged app — the only place the marker is ever set — they resolve identically
anyway, because that spawn passes no `TQ_DB_FILE_PASSWORD` for a fallback to find. The env fallback for a marker-set backend therefore
survives only as the read timeout, which is the case that carries defensive weight. And the channel is **one-shot by construction**:
completion depends on the parent closing the stream, so nothing else can ever be sent over this stdin without redesigning the
protocol. It carries exactly one secret, exactly once.

**Consequences:** This is the epic's only change to `traquity-server-spring` — no OpenAPI/spec change, no codegen. The password
still lives in JVM memory afterwards, and on the Electron side in the V8 heap as an immutable string (both inherent); a heap dump of
either process still contains it. Story #40 carries the details.

**What this does and does not buy, so that nothing later over-reads it:** the gain is the removal of a *passive, lifetime-long*
exposure — the env block is readable by any same-user process at any point during the run and is captured by crash dumps and support
tooling, whereas the pipe's content exists only until the backend reads its line. It is deliberately **not** a boundary against a
same-user attacker, who can still open the child's `/proc/<pid>/fd/0` and race for the bytes, `ptrace` the JVM, or read its memory on
Windows. The epic's security posture rests on the local user account, not on this pipe.

**Complete password path, for the record:** unlock/setup screen (renderer) → `ipcRenderer.invoke('backend:start', password)` → main
process → the child's stdin, closed right after → Spring property source. The renderer→main IPC hop is not new in kind: today's
`custom-electron-prompt` is itself a hidden renderer window that returns the value to the main process via IPC — the epic replaces it
with our own screen over the same, process-internal channel (Electron IPC runs on Chromium's Mojo pipes, not observable by other OS
processes, unlike the child's environment block that this ADR eliminates).

## ADR-009: Config reads/writes run in the Electron main process via IPC — not in backend REST endpoints

**Status:** ACCEPTED

**Decision:** Config reads and writes run in the main process, exposed through the bridge. The Spring backend and the OpenAPI specs are
not touched for any of it.

**Rationale:** `traquity.config.json` is main-process territory (read at spawn time, written by the screens here) — a second writer
would create ownership and race problems. Switching databases requires a backend restart anyway (env fixed at spawn), so the backend could
never apply these changes itself.

**Trade-off accepted:** no integration-test harness exists for Electron main code — file/config logic stays in separate, dependency-injected
modules plus the manual test checklist (Definition of done).

## ADR-010: A downloaded JDK lives in the app's working directory, not in `userData`

**Status:** ACCEPTED

**Context:** `java/corretto-download.js` targets `path.resolve('java')`, staged through `path.resolve('java-download')`; on darwin `main.js`
`chdir`s to the `.app` bundle's parent first. The obvious alternative is `app.getPath('userData')`, the conventional Electron location for
app-managed files.

**Decision:** the working directory stays. The download exists to spare users who do not want to manage a JDK themselves, and keeping the
runtime next to the app means deleting or updating the app takes the JDK with it, instead of leaving a few hundred megabytes of orphaned
Java behind on the machine. That is a real user benefit with no equivalent under `userData`, and it is the same reasoning that made ADR-005
unify all three platforms on the working directory rather than keep Linux on a `~/.traquity/java` dotdir.

**Consequences:** two residuals follow from "the working directory is the artifact root" rather than from the download itself, and are
accepted with the location:

- On macOS the `chdir` puts the runtime in the `.app` bundle's parent, commonly `/Applications`, which is group-writable by `admin` — the
  binary the app later executes sits in a directory any admin-group process can replace. Dropping the darwin `chdir`, or creating the target
  with an explicit `0700`, would address this without moving anything.
- `rmSync(<cwd>/java, {recursive: true, force: true})` runs before the rename, so an unrelated `java` directory in the working directory is
  deleted. This needs no attacker: a Linux `.desktop` launch commonly leaves cwd at `$HOME`, where `~/java` is a plausible thing for a user
  to have. A guard that refuses a target which exists and does not look like a previous download of this app is worth having on its own
  merits.

## ADR-011: `traquity.config.json` and `traquity.log` move into `~/traquity/`

**Status:** ACCEPTED

**Context:** `traquity.config.json` was written directly into the user's home directory (`os.homedir()`), and `traquity.log` into the app's
own working directory (`process.cwd()`) — two different locations for the app's own technical input/output, one of which clutters a
directory the user does not otherwise associate with TraQuity at all. Both files are read and written only by the Electron main process
(ADR-009); neither is meant for the user to browse casually, but both are worth being able to find — the config file to hand-edit per
[The configuration file](../USER_MANUAL.md#the-configuration-file), the log file to diagnose a failed start.

**Decision:** Both files move into a single new directory, `~/traquity/`, created once at startup if missing
(`traquity-client-angular/electron/main.js`'s `ensureAppDataDir`). `traquity.config.json` moves from `~/traquity.config.json` to
`~/traquity/traquity.config.json`; `traquity.log` moves from the app's working directory to `~/traquity/traquity.log`. No migration of an
existing `~/traquity.config.json` is performed — the same "an upgraded config is simply not found" pattern ADR-002 already accepts for a
key rename applies here to the whole file: an upgrade starts into the configuration screen once, exactly as a first run would.

The downloaded JDK is deliberately **not** moved here — it stays in the app's working directory, for the reasons ADR-010 already gives
(deleting or updating the app takes the JDK with it). That reasoning is about the JDK's lifecycle tracking the app installation, which does
not apply to the config file or the log — both are user data belonging to the person running the app, independent of which copy of the app
they later run.

**Rationale:**

- A user's home directory is shared with every other application on the machine; a bare `traquity.config.json` sitting directly in it is
  clutter that gives no hint which app it belongs to, unlike the folder it now lives in.
- Both files are technical input/output the user might legitimately want to look at (hand-editing the config, reading the log after a
  failed start) — worth keeping easy to find, not worth hiding inside a dotdir or `userData`, and not worth leaving loose in `$HOME`
  either.
- `~/traquity/` is also a staging ground for future app files that are neither the config nor the log — e.g. a system prompt, should an AI
  feature be added later — without inventing a new location for each one.

**Consequences:** `~/traquity/` needs to exist before either file is written; `ensureAppDataDir` creates it (`fs.mkdirSync` with
`recursive: true`) once at startup, before anything else in `main.js` touches either path. A failure to create it is logged rather than
thrown - the write it would have enabled (`config-file.js`'s `save()`, or the backend's log stream) then fails on its own terms right
after, through error handling that already exists for a missing/unwritable file and needs no change here.

## ADR-012: The first line of stdin is the password

**Status:** ACCEPTED

**Context:** Windows maps every signal to `TerminateProcess`, so a `SIGTERM` sent to the backend skips Spring's shutdown hook and H2's
file close — and both callers (`window-all-closed`, `app:restartAndConfigure`) exited the main process right after sending it anyway,
giving the child no chance to catch up. Measured effect: identity blocks of 32 lost per run (JPA's sequence allocator), and MVStore
writes not yet flushed to the H2 file.

**Decision:** The child's stdin receives the password and the signal to shut down the application and database. It partially supersedes
ADR-008

|                           | ADR-008                                  | Now                       |
|---------------------------|------------------------------------------|---------------------------|
| Password                  | entire stream content, EOF-terminated    | first line, LF-terminated |
| Stream after the handover | closed by the parent right after writing | stays open for the run    |
| Closing the stream        | is the handover completing               | is a shutdown request     |

On the Electron side, the child's stdin is closed, it waits for its `exit`, and force-kills it after a bounded timeout if it doesn't answer.
Both quit paths — `window-all-closed` and `app:restartAndConfigure` — await it. On the backend, upon reaching `EOF` on `System.in`,
`context.close()` followed by `System.exit(0)` are executed.

**Consequences:**

- ADR-008 chose EOF-termination specifically so no delimiter had to be excluded from the password. That
protection is gone — a password containing a line feed can no longer be handed over. Nothing produces one today: the renderer's
password inputs are single-line. No trimming is introduced on either side; the bytes before the first line feed are the password
  verbatim, `\r` included. This is why the app does not need a major release with this change.
- A main process that dies without quitting closes the pipe as the OS reclaims its handles, so the backend goes down with it.
- A child orphaned by a start that raced a quit dies the same way — something the old `kill()` could never reach.

The force-kill timeout is the bound on a backend that ignores the closed stream and never exits on its own.
