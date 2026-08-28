# AI

## ADR-001: AI is a settings section behind a one-time notice confirmation

**Status:** accepted

**Decision.** AI model management is a section of the existing settings page (`src/settings/ai/`, an accordion panel alongside
`appearance/`, `data-source/`, `security-group/`, `restart-configure/`), bridge-gated exactly like `restart-configure` so it disappears
under `ng serve`. The section renders a short notice first and nothing else: what the models are, that they are third-party weights under
Apache-2.0, that a download is 1.3–6.2 GB from Hugging Face, and that answers a local model produces are unreliable and always confirmed by
a human. Most importantly, the users confirm that neither TraQuity nor the AIs are capable of providing financial advice and the integration
of AI features is purely for informational purpose. `Confirm` unlocks the section, and it stays unlocked on this machine until the notice
itself changes.

**The notice is one static HTML file, and its sha256 is the confirmation token.** `AiNoticeComponent` is static HTML with no inputs and no
logic, exactly like `PrivacyNoticeComponent`. That same `ai-notice.component.html` is also copied into the Electron resources at packaging
time (`forge.config.js`, the hook that already copies `backend.jar`), so the main process has the exact bytes the renderer displays.
`ai:confirm` therefore takes **no arguments**: the main process hashes the resource file with sha256 and writes that digest to the config.
The section is unlocked while the stored digest equals the digest of the packaged file, so **every changed character re-asks** — no version
number to bump, and no consent surviving the text it was given for.

**Why a gate at all.** The features using AI exist in different parts of the app. While all of them will contain a short disclaimer, having
the users confirm a more verbose disclaimer is the right tool for increasing awareness.

**Consequences.**

- Both the digest and the lock decision live in the main process; the renderer only renders the notice and calls `ai:confirm`. The bridge
  hands it a boolean, never a digest to compare.
- Reformatting the file re-asks, as does a typo fix. That is the deal: the rule is the file's bytes, which needs no judgement call about
  what counts as a meaningful edit.
- One file, two consumers: Angular compiles it as the component's template, packaging copies it as a resource. They cannot drift, because
  there is nothing to keep in sync.
- The gate is a disclosure the user acted on; the transparency note stays what it always is — a disclosure nothing gates on.
- Nothing else in the app gates on the confirmation: with no model active, every future AI entry point reads "no model" regardless.
- A re-locked section does not touch what is already on disk: installed models and the active one stay in the config and keep working while
  the notice is unconfirmed. The gate governs the section's controls, not the artifacts.

## ADR-002: The `ai` key in `traquity.config.json` is the truth, and it is hand-editable

**Status:** accepted

**Decision.** One top-level `ai` object, alongside `env`, `auth` and `java`:

```json
{
  "ai": {
    "confirmedNotice": "<sha256 of the packaged ai-notice.component.html, as confirmed>",
    "models": {
      "qwen-4b": {
        "path": "C:\\Users\\x\\traquity\\ai\\models\\Qwen_Qwen3.5-4B-Q4_K_M.gguf",
        "active": true
      }
    }
  }
}
```

An absent `ai` key is the default and means "notice not confirmed, nothing installed". A key absent from `models` means that model is not
downloaded — absence is the state, mirroring how a missing `auth` entry reads as `pending`. A model's own `path` is the only thing that
locates it: **no download directory is remembered.** A model moved by hand keeps working as long as its `path` is edited along with it.

**Why the Electron config and not the DB-backed app config.** What is on this disk is per-machine; DB client config is per-database and
would travel to a machine where none of these files exist. Same reason `auth` and `java` live here.

**More than one `active` is an invalid state the app must survive, not resolve.** The file is user-editable, so it can happen. The renderer
picks one of them at random and uses it. That is deliberate: there is no principled tie-break, and a deterministic one (first key, largest
model) would read as a rule and hide the mis-edit instead of exposing it. The pick happens **once, when the config is ingested into the
slice** — never in a selector, which has to stay pure and memoizable — so the choice is stable for the session and visible in the store.

**Consequences.**

- Validation is per entry, like `auth`: one mangled model entry makes that model read as not installed while the rest of the file still
  loads.
- A `path` pointing at a file that no longer exists reads as not installed, and the entry is what the next download overwrites.
- `confirmedNotice` is the only key any of this writes before a download exists, so the first `Confirm` is what creates the `ai` key. The
  schema takes it as a base64 sha256; anything else — including a hand-edited value — reads as unconfirmed rather than as a broken config.

## ADR-003: Downloads reuse the Corretto download's shape — pinned, verified, and not interruptible

**Status:** accepted

**Context.** `electron/java/corretto-download.js` already solved this problem once, and every bound in it was written for a reason that
applies harder to a 6.2 GB file: the byte cap enforced on the stream rather than on a `content-length` the sender wrote, the staging
directory so a failure leaves what was there intact, the `https:`-only redirect check, the removal retries for a directory a virus scanner
is busy with. `electron/security/verify-hash.js` already streams a file into a hash.

**Decision.** A download resolves the pinned `resolve/<revision>/<file>` URL into a staging directory next to the chosen model directory,
capped at the catalogue's exact byte count plus a small margin, streamed into a sha256 and compared against the pinned digest. A mismatch is
a failed download: the file is removed and no config entry is written. Progress is pushed to the renderer on its own channel and rendered by
the existing `DownloadProgressComponent` — the same shape `java:downloadProgress` already has.

**No cancel, no pause, no resume.** A download runs to completion or fails. Resume would need range requests and a partial-file state in the
config; cancel would need a teardown path through the stream, the staging directory and the slice. Neither is worth its complexity for an
action taken once per model, and a failed or abandoned download costs a repeat, never a corrupt install.

**Signatures are not available, and this is not an oversight.** Amazon signs Corretto and publishes the detached `.sig` beside it; nobody
signs GGUF weights. There is no publisher key to pin, so `corretto-signature.js` has nothing to verify against here. The pinned digest is
what replaces it, and its provenance is the app's own signed installer — the catalogue is baked into the release, not fetched.

**Consequences.**

- The catalogue is a constant in `electron/ai/`, shared with the renderer through the bridge rather than duplicated in Angular.
- The residual risk is a repository that was already compromised when a catalogue entry was authored. Inherent to curating third-party
  weights.
- A repeated download of the same model replaces what is there.

## ADR-004: A global `ai` store slice, read through the bridge

**Status:** accepted

**Decision.** A new global NgRx slice, `ai`, joining `app-config`, `depot`, `dividend-announcement` and `security` in `AppState`, laid out
like `security` (`ai.state.ts`, `.actions.ts`, `.reducer.ts` + `reducers/`, `.selector.ts` + `selectors/`, `.effects.ts` + `effects/`). It
holds the notice confirmation, the catalogue, what is installed per key, which model is active, and transient download progress. Its effects
inject an `AiBridgeService` shaped like `StartupBridgeService`, so the pure-rxjs effect rule holds unchanged.

**Why a slice and not a Signal Store.** A download outlives the section that started it, its work is effect-shaped (long-running, progress
arriving as pushed events — one action per event, one reducer per transition). The global store will be providing effects for the components
to interact with the `AiBridgeService`; for that purpose it needs its slice to hold the current configuration. That is the global store's
stated criterion. `StartupStore` is a Signal Store for reasons that do not apply here: it is read before the first navigation, by an app
initializer and a route guard.

**The slice initializes itself upon application start** by picking up the init action and then ask the `AiBridgeService` (if it exists) to
read the current ai config from `traquity.config.json`.

**The config is the truth; the slice is a read-through cache of it.** Every write goes out through the bridge and the slice updates from
what the bridge returns — never optimistically, never from the action's own payload. That is how `config:apply` already behaves, and it is
what keeps ADR-002 honest.

**Consequences.**

- This is the first global slice fed by the bridge rather than by a generated API client. No OpenAPI change, no codegen, no backend change:
  `traquity-api` and `traquity-server-spring` are untouched by this whole epic.
- Purely local section state — which entry is expanded — stays a component concern; the epic adds no Signal Store.

## ADR-005: A machine capability probe, a requirement per model, and a verdict that warns rather than blocks

**Status:** accepted

**Context.** Every figure in this epic was measured on one RTX 2080 (8 GB, CUDA), with the model fully or — for the 9B — partially
offloaded. Nothing was measured on Metal, and nothing at all was measured on a CPU. The verdict must be computed **before** any model exists
on disk. Reading the machine's side of that without help means Electron's `app.getGPUInfo`, an `nvidia-smi` spawn and a per-platform guess
at unified memory — three unreliable sources answering a question `node-llama-cpp` answers directly.

**Decision.** `node-llama-cpp` (MIT, as is the llama.cpp it wraps) becomes a dependency of this epic and is the sole source of the machine's
side of the verdict. The main process calls `getLlama()` once per start and reads `llama.gpu` for the backend it resolved and
`llama.getVramState()` for total and free VRAM. **Loading the binding is not loading a model** — no weights are read, no context is
allocated, and the epic still runs no inference. Shipping the runtime now is no cost either: the follow-up epic ships it regardless.

| `llama.gpu` | backend         | verdict basis                                   |
|-------------|-----------------|-------------------------------------------------|
| `'cuda'`    | CUDA            | reported VRAM against the requirement           |
| `'metal'`   | Metal           | reported VRAM (unified) against the requirement |
| `'vulkan'`  | not recognized  | `unsupported`, see below                        |
| `false`     | none — CPU-only | `unsupported` for every entry                   |

`getLlama()` failing — no prebuilt binary for the platform, a driver that refuses to initialize — yields `unknown` for every entry rather
than an exception, and the section says so.

Requirements, taken from the parent epic's observed allocations at 20k context (the largest any planned usecase needs):

| key       | required |
|-----------|----------|
| `qwen-2b` | 3 GB     |
| `qwen-4b` | 5 GB     |
| `qwen-9b` | 11 GB    |

Verdicts are `ok`, `unsupported`.

**A GPU backend is required by all three entries, the 2B included, so a CPU-only machine reads `unsupported` throughout.** The 2B is the one
where that is a judgement call rather than an obvious consequence of the VRAM figures: its weights are 1.28 GB, and generation on a current
desktop CPU would be usable.

**A verdict never blocks anything; it gates a confirmation.** `unsupported` keep the download button enabled and put the verdict and its
reason into a confirm dialog first, and activating such a model is equally permitted.

**Vulkan is detected but not recognized.** `node-llama-cpp` ships Vulkan prebuilts, so `llama.gpu` can legitimately report `'vulkan'` on an
AMD or Intel GPU and `getVramState()` then answers for it.

**The requirement figures stay catalogue constants; `GgufInsights` is not used here.**

**Consequences.**

- **A new dependency, and a native one.** `node-llama-cpp` is MIT and permissive-compatible, so the licensing rule is satisfied, but it
  carries prebuilt binaries per platform and backend: packaging must unpack it from the asar, `licenses:generate` picks it up, and the
  installer grows. All of that is work the follow-up epic would have to do anyway, done once, here.
- The binding is loaded in the main process, and the whole probe is one `getLlama()` plus one `getVramState()` — no model path is involved,
  so the probe is equally answerable on a machine with nothing downloaded.
- The verdict is derived, never persisted: a machine changes, and a stale verdict in `traquity.config.json` would outlive the truth.

## ADR-006: Download lifetime state stays in the `ai` slice, not in the settings section's Signal Store

**Status:** accepted

**Context.** ADR-004 made the `ai` slice global, with one line on downloads ("a download outlives the section that started it"), and closed
by saying the epic adds no Signal Store at all. `#86` made the question concrete: `download` and `downloadErrors` are read by one component,
`AiPageComponent`, and by nothing else. On reach alone they look screen-local, and the AI section could own them in a Signal Store the way
the configuration screen owns `javaDownload`
in `ConfigureStore` (at the time of writing).

**Decision.** In-flight download state stays in the `ai` slice, root-registered (`provideStore`/`provideEffects` in `app.config.ts`) and not
provided by the settings route. The criterion is **lifetime, not reach**: state owned in the main process beyond the screen's life, which
the screen cannot re-derive on remount, belongs to the slice however few components read it.

**Why.**

- **The main process owns the download throughout.** `ai:download` is one long-running `invoke` resolving only after transfer, hash check
  and install, with an `aiDownloading` mutex held for that whole span. The renderer holds a view of a lifetime it does not control.
- **It is not re-derivable.** `ai:getState` answers with the notice confirmation and the installed models; there is no "running at 43%" to
  ask for. That is what separates it from `javaVerification`, which `ConfigureStore` re-derives from `configure:getState` on every mount.
- **The failure mode is a bug.** Destroying a page-scoped store unsubscribes the `from(promise)` over the IPC call and cancels nothing: the
  download continues, the mutex stays held, and the remounted catalogue offers `showDownloadButton: true`. Pressing it answers that a
  download is already running — a failure message for a download that is working. ADR-003 leaves no cancel path, so the renderer cannot
  clear the mutex either; the user waits it out. Weights are large enough that navigating away mid-download is the expected case.
- **The progress push is app-lifetime.** `ai:downloadProgress` arrives whenever the main process emits, and `trackAiDownloadProgress`
  subscribes once on `AppActions.initialize`.
- **The view model would split.** `getCatalogueSelector` joins `catalogue` + `models` with `download` + `downloadErrors`; separating them
  means reassembling that join across a selector and a computed.

**The `ConfigureStore` contrast.** `javaDownload` belongs in a screen-scoped store because the configuration screen *is* the app while it is
up, its outcome feeds that screen's own `javaValid` gate, and it re-derives from the bridge on mount. The AI section has none of the three.

**Consequences.**

- Navigating away mid-download and returning shows current progress with no re-fetch — the root-registered effects were never torn down. A
  download finishing or failing while the user is elsewhere lands in the slice the same way.
- Nothing outside the AI section surfaces a running download, so there is no indication one is in flight while the user is elsewhere.
  Whether that deserves a header indicator is left open.
- A renderer reload still drops it, and nothing can recover it for the reason above. Closing that means having `ai:getState` report an
  in-flight download; worth a story if a reload is judged realistic, and it changes nothing here.
- ADR-004's "transient download progress" takes the shape `download: {key, progress} | null` plus `downloadErrors`, not a per-key map: the
  main process permits one download at a time, so a map would model a state that cannot occur.
- `downloadErrors` is arguable — losing it on navigation would be defensible. It stays because it is keyed by catalogue key and cleared by
  the reducer that starts a download.

## ADR-007: Inference runs in a child process, one request at a time, run to an outcome

**Status:** accepted

**Context.** ADR-005 already loads `node-llama-cpp` in the main process for the capability probe, which reads no weights and allocates no
context. Running a generation there is a different proposition: it is seconds to minutes of work on the event loop that owns the window, the
config file and the backend spawn. A prompt evaluation alone takes 5–10 s on a warm GPU, and a partially offloaded model has been measured
at 53–100 s per answer.

**Decision.** A model is loaded and prompted in a `utilityProcess` the main process spawns, never inline on the main process and never in
the renderer. One model is loaded at a time: loading another unloads the current one, and an idle timeout unloads it entirely. A second
request while one is running is rejected with that as the reason.

**No cancel**, for the reason ADR-003 already gives for a download: a teardown path through the child, the request and the caller's state
buys back a wait the caller can simply sit out. An abandoned generation costs the user the seconds it had left; nothing is written either
way, so there is no partial state to unwind.

**Every request names its model by catalogue key.** The caller sends the key, never a path and never nothing; the main process resolves it
through `ai-registry.js`, which already answers a key with the config's entry and **checks only that a file exists at that path** — what the
bytes there are is not its question. That check is the whole validation a request performs. The digest was verified once, at download time
(ADR-003), and re-hashing 1.3–6.2 GB on the way into every extraction would cost seconds to answer a question already answered.

**Why the key and not the process's own idea of "the active model".** ADR-002 makes the active flag hand-editable and explicitly declines to
resolve more than one active entry, leaving the renderer to pick one when the config is ingested. A request carrying the key keeps that one
choice in one place instead of re-deriving it behind the bridge, where it could disagree. It also makes a second model a caller-side change:
pointing one usecase at a different key needs no new channel, no config shape and nothing here.

**Why not the renderer.** Prompt resolution (ADR-010), the grammar (ADR-011) and the model's lifetime need one owner, and the weights sit on
a disk path the renderer has no business reading. The renderer stays a bridge client, as ADR-004 already has it for model management.

**Consequences.**

- One request/response channel per usecase, each through `ipc/trusted-sender.js` with a bounded `ipc/ipc-schema.js` entry like the rest. The
  model key is one of the bounded arguments, and `aiModelKeySchema` already exists for it.
- A key with no entry, or an entry whose file has gone, is a failed request naming that as the reason. It is the same state a removed or
  hand-moved model already produces everywhere else, so nothing new has to model it.
- The key also picks the model-specific prompt layer (ADR-010), so one argument decides both the weights and the prompt.
- A cold load costs seconds to tens of seconds, so the bridge distinguishes **loading** from **generating**; a caller that cannot tell them
  apart shows a wait that reads as a hang.
- A crash or a hang in the child kills a process that holds nothing: the window stays up and the failure is reportable.

## ADR-008: PDF parsing runs in the renderer

**Status:** accepted

**Context.** A broker PDF is the input of the document-extraction usecase, and it is attacker-controllable.

**Decision.** `pdfjs-dist` runs **in the renderer**, called directly by the screen that took the file. Only the extracted document model
(ADR-009) crosses the bridge; a file's bytes never do.

**Why.** A parse is the one step of this domain with no prompt, no model and no lifetime: a file goes in, a document model comes out, and
every way it can fail — a file that is not a PDF, an encrypted one, a scan with no text layer — is a message the user has to read on the
screen they are standing on. Keeping the parse there keeps the failure where it is reported. Moving it behind the bridge turns each of those
into an IPC result type, a schema entry and an error string threaded back through a channel, for a step that gains nothing from the trip.

**Alternatives declined.**

- *Parsing in the inference process (ADR-007).* It buys process isolation for the parse and costs the error handling above. The isolation is
  also less than it looks: that child is a Node process with ambient file-system and spawn access, so it is not a sandbox either.
- *Parsing in a Java library.* Puts the extraction on the far side of an HTTP boundary from the model that consumes it, for no gain, and
  contradicts ADR-004's "no AI surface in the backend".

**Consequences.**

- `pdfjs-dist` (Apache-2.0, pure JS, no native binary) joins the client's **`devDependencies`**, where every other renderer library already
  sits — `@angular/*`, `echarts`, `rxjs`, `date-fns`. The client's `dependencies` block means something narrower here: what the packaged
  main process resolves out of `node_modules` at runtime (`node-llama-cpp`, `zod`), since electron-packager prunes
  `devDependencies` from the asar. A renderer library is bundled by `ng build` and resolved from nothing.
- **Attribution is unaffected.** `ng build` writes `3rdpartylicenses.txt` for every package that lands in the bundle, and
  `generate-third-party-licenses.js` reads that file as its first source — the dependency block is only how it finds the *shell's* runtime
  closure. A renderer library is attributed because it was bundled, whichever block it sits in.
- **The hostile-input rule is now this path's own to honor.** pdf.js runs with `isEvalSupported: false`, and nothing it returns reaches a
  template except through the form fields it fills. The form fields have their own input validation.
- A malformed document that hangs the parse now blocks the window, which the child process would have absorbed. The parse is therefore
  bounded — a page count, a run count and a time budget — and a document exceeding any of them is refused with that as the reason.
- The bridge channel's `ipc/ipc-schema.js` bound is over the extracted text: a cap on rows and on total length.
- The extraction stages live in a module of their own with their own spec, not in the component that happens to call them first.

## ADR-009: PDF text is extracted with its coordinates, never flattened

**Status:** accepted

**Context.** Prototyping ran eight real broker documents from three German brokers through `pdftotext -layout` and found three failures that
survived every prompt version on every model, all in fields an import gets wrong silently. Dumping those documents at coordinate level
showed why: in the source, every label sits on **exactly the same baseline** as its value, and the flattening shifted the whole value column
down one row against the labels. `Zahlbarkeitstag` lost its value, and every following label took its predecessor's. The models were reading
a scrambled transcription and doing well at it.

**Decision.** Extraction produces a **geometric document model**, never a flattened text dump, in five deterministic stages:

1. **Runs** — `getTextContent()` per page, each item with `x`, `y` (flipped so a smaller number is higher), `width`, `height`, `fontName`.
2. **Join** adjacent runs on one baseline whose boxes touch. Necessary, not cosmetic: one broker splits `Limit-Order` into `"Limit-Orde"`
   and `"r"`, another emits nearly every word as its own run.
3. **Rows** — cluster by baseline with a tolerance proportional to font height, never a fixed epsilon and never a page-global row grid.
4. **Cells** — within a row, split where the horizontal gap exceeds a fraction of the font size, so column bands are per row.
5. **Normalize** — a trailing-sign amount (`216,05-`) or braces (`(216,05)` for negative values) to a signed decimal, and a neighbouring
   `EUR`/`USD` (or other currency) cell to a currency.

The AI model then receives a rendering of that document model — one line per printed row, ` | ` between the cells of that row — in which a
label and its value are adjacent because they were associated by coordinate.

**Alternatives declined.**

- *A flattened text dump.* The subject of this ADR.
- *A vision model over page images.* Roughly doubles the memory footprint to solve, statistically, what stages 1–5 solve exactly. The
  failures are geometry failures, not perception failures.
- *Prompting around the scrambling.* Attempted across four prompt versions and two models. It moved two of the three failures by nothing.

**Consequences.**

- **A PDF with no text layer (e.g. a scan) is refused with that as the reason.** No OCR: it would be a second model, a second download and a
  second class of error. It is detectable in stage 1 — a page with no runs.
- A text layer can be lossy in ways geometry cannot repair (one examined document is missing a glyph from a word in its header), so the
  extractor must not assume the layer is complete.
- Extraction quality is measurable per broker, and brokers differ enough that adding one is a fixture and a benchmark run, not a code
  change. Stage 5 also removes the model's single largest source of arithmetic error.

## ADR-010: System prompts are layered files, packaged defaults and on-disk overrides

**Status:** accepted

**Context.** Prompts are the artifact this domain iterates on most. They must be tunable without rebuilding the app, and the shipped ones
must be versioned with the release.

**Decision.** Resolve per (usecase, model) on every request, first hit wins:

1. `~/traquity/ai/prompts/<usecase>/<model>.md` — override, model-specific
2. `~/traquity/ai/prompts/<usecase>/default.md` — override, usecase-wide
3. packaged `prompts/<usecase>/<model>.md` — default, model-specific
4. packaged `prompts/<usecase>/default.md` — default, usecase-wide
5. If none of these exist, the app must handle that error gracefully

**Alternatives declined.**

- *A database table.* Tuning would mean the H2 console, every shipped tweak would become a migration. It also sits behind Java, which
  ADR-004 already rules out for this domain.
- *Packaged resources only.* Blocks tuning without a rebuild.

**Consequences.**

- **Layer 4 is what makes the resolution total, and it is a packaging invariant and not a fact about the running system.** A packaged
  `default.md` ships for every usecase, so a request normally cannot fail to find a prompt. A build that shipped without one, or an install
  someone edited, breaks that. The resolver therefore treats "no layer answered" as a failed request naming the usecase whose prompt is
  missing, and never runs the model on an empty system prompt: a wrong answer produced with no instructions is worse than a stated failure.
- `default.md` is the file that wins on the most models, and a `<model>.md` exists only where it earns points on that model. One is deleted
  when it stops costing the others anything.
- Renaming a catalogue key (ADR-002) orphans any model-specific override for it. Layer 2 or 4 then answers, so behavior stays correct and
  the file silently stops being consulted — which is why the app must be able to report **which layer resolved** a given request. The
  failure mode of an override is forgetting one is in place and debugging the wrong prompt.
- **No shipped prompt names a vendor or a company.** Prompts must remain abstract so that the entire audience of the app can benefit from
  them. Power users are invited to tune their own prompts using the rules provided by this ADR.

## ADR-011: For PDF import, the model emits one grammar-constrained JSON object, and it writes nothing

**Status:** accepted

**Context.** The model could be given tools and allowed to drive a loop, including database mutation.

**Decision.** It is not. The model gets exactly one job per invocation of the PDF usecase: produce JSON matching a grammar (GBNF /
JSON-schema constrained decoding), for one document, in one context that is discarded afterwards. **No endpoint that mutates the database is
reachable from it** — no `POST`, `PUT`, `PATCH` or `DELETE`. Resolution, validation and persistence happen afterwards in deterministic code,
and the result is a draft a human confirms before anything is written.

**The document's own literals constrain the grammar.** Fields whose value must come from the page are alternations over the literals stage 5
of ADR-009 extracted, plus an explicit "absent" (`undefined`). A date the model cannot produce is a date it cannot invent.

**The extraction takes a currency as an input and ignores every amount denoted in another one.** A dividend printing a foreign amount and
its converted counterpart states each figure twice, and taking both is how a total silently doubles. The caller passes the currency the
result is wanted in; lines in any other currency are not extracted.

**Alternatives declined.**

- *Tools and a multi-step agent loop.* Declined for reliability: a 2B–9B model emitting well-formed calls, reading results and looping
  correctly across many documents is optimistic, and a feature producing output the user must discard half the time is not useful.
- *Post-hoc validation instead of a grammar.* It turns an impossible output into a rejected one, which needs the retry loop the grammar
  removes.

**Consequences.**

- Constrained decoding guarantees parseable output, so there is no retry-on-malformed-JSON path. Measured: every output of every prototype
  run was valid JSON.
- **The grammar is not the last check.** It constrains shape and says nothing about sense — a generated artifact goes through the same
  validation a file picked off disk does, and then in front of a human. Grammar for shape, schema for validity, human for sense.
- **The extractor becomes the ceiling.** A value ADR-009 missed is a value the model cannot emit. That is the right trade — a missing field
  shown as empty beats a plausible invented one — but it makes extractor coverage another bottleneck.
- One invocation per document costs nothing: no cross-document state, no context pressure, graceful degradation on weaker models.
- Where a target type carries one summed field, the model is asked for the sum and not for the lines. That is safe only because of the
  currency rule above; without it, the foreign-currency duplicate of a tax line enters the total.
