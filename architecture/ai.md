# AI

## ADR-001: AI is a settings section behind a one-time notice confirmation

**Status:** accepted

**Decision.** AI model management is a section of the settings page (`src/settings/ai/`, an accordion panel alongside `appearance/`,
`data-source/`, `security-group/`, `restart-configure/`), bridge-gated like `restart-configure` so it disappears under `ng serve`. The
section renders a notice and nothing else: what the models are, that they are third-party weights under Apache-2.0, that a download is
1.3–6.2 GB from Hugging Face, that a local model's answers are unreliable and always confirmed by a human, and that neither TraQuity nor the
models give financial advice. `Confirm` unlocks the section, and it stays unlocked on this machine until the notice itself changes.

**The notice is one static HTML file, and its sha256 is the confirmation token.** `AiNoticeComponent` is static HTML with no inputs and no
logic, like `PrivacyNoticeComponent`. Packaging copies that same `ai-notice.component.html` into the Electron resources (`forge.config.js`,
the hook that copies `backend.jar`), so the main process holds the exact bytes the renderer displays. `ai:confirm` therefore takes **no
arguments**: the main process hashes the resource and writes the digest. The section is unlocked while the stored digest equals the packaged
file's, so **every changed character re-asks** — no version to bump, and no consent outliving the text it was given for.

**Why a gate at all.** The AI features sit in different parts of the app. Each carries a short disclaimer; one verbose disclaimer confirmed
once is the tool for raising awareness of what they are.

**Consequences.**

- Both the digest and the lock decision live in the main process; the renderer renders the notice and calls `ai:confirm`. The bridge hands
  it a boolean, never a digest to compare.
- Reformatting the file re-asks, as does a typo fix. That is the deal: the rule is the file's bytes, which needs no judgement about what
  counts as a meaningful edit.
- One file, two consumers: Angular compiles it as a template, packaging copies it as a resource. They cannot drift, because there is nothing
  to keep in sync.
- The gate is a disclosure the user acted on; the transparency note stays a disclosure nothing gates on.
- Nothing else in the app gates on the confirmation: with no model active, every AI entry point reads "no model" regardless.
- A re-locked section leaves what is on disk alone: installed models and the active one keep working while the notice is unconfirmed. The
  gate governs the section's controls, never the artifacts.

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

An absent `ai` key means "notice not confirmed, nothing installed". A key absent from `models` means that model is not downloaded — absence
is the state, mirroring a missing `auth` entry reading as `pending`. A model's own `path` is the only thing that locates it: **no download
directory is remembered**, and a model moved by hand keeps working once its `path` moves with it.

**Why the Electron config and not the DB-backed app config.** What is on this disk is per-machine; DB client config is per-database and
would travel to a machine where none of these files exist. Same reason `auth` and `java` live here.

**More than one `active` is an invalid state the app survives.** The file is user-editable, so it can happen. Ingestion keeps the first
entry the config reports and clears the flag on every other, and it happens **once, as the config enters the slice** — never in a selector,
which stays pure and memoizable — so the choice is stable for the session and visible in the store.

**Consequences.**

- Validation is per entry, like `auth`: one mangled model entry makes that model read as not installed while the rest of the file loads.
- A `path` pointing at a file that is gone reads as not installed, and the entry is what the next download overwrites.
- `confirmedNotice` is the only key written before a download exists, so the first `Confirm` creates the `ai` key. The schema takes a base64
  sha256; anything else — a hand-edited value included — reads as unconfirmed and never as a broken config.

## ADR-003: Downloads reuse the Corretto download's shape — pinned, verified, and not interruptible

**Status:** accepted

**Context.** `electron/java/corretto-download.js` solves this problem once already, and every bound in it applies harder to a 6.2 GB file:
the byte cap enforced on the stream and never on a `content-length` the sender wrote, the staging directory so a failure leaves what was
there intact, the `https:`-only redirect check, the removal retries for a directory a virus scanner is busy with.
`electron/security/verify-hash.js` already streams a file into a hash.

**Decision.** A download resolves the pinned `resolve/<revision>/<file>` URL into a staging directory beside the chosen model directory,
capped at the catalogue's exact byte count plus a small margin, streamed into a sha256 and compared against the pinned digest. A mismatch is
a failed download: the file is removed and no config entry is written. Progress is pushed on its own channel and rendered by the existing
`DownloadProgressComponent`, the shape `java:downloadProgress` already has.

**No cancel, no pause, no resume.** A download runs to completion or fails. Resume needs range requests and a partial-file state in the
config; cancel needs a teardown path through the stream, the staging directory and the slice. Neither earns its complexity for an action
taken once per model, and a failed download costs a repeat and never a corrupt install.

**Signatures are not available, and this is not an oversight.** Amazon signs Corretto and publishes the detached `.sig` beside it; nobody
signs GGUF weights. With no publisher key to pin, `corretto-signature.js` has nothing to verify against. The pinned digest replaces it, and
its provenance is the app's own signed installer — the catalogue is baked into the release and never fetched.

**Consequences.**

- The catalogue is a constant in `electron/ai/`, shared with the renderer through the bridge and never duplicated in Angular.
- The residual risk is a repository already compromised when a catalogue entry was authored. Inherent to curating third-party weights.
- A repeated download of the same model replaces what is there.

## ADR-004: A global `ai` store slice, read through the bridge

**Status:** accepted

**Decision.** A global NgRx slice, `ai`, joining `app-config`, `depot`, `dividend-announcement` and `security` in `AppState`, laid out like
`security`. It holds the notice confirmation, the catalogue, what is installed per key, which model is active, and transient download
progress. Its effects inject an `AiBridgeService` shaped like `StartupBridgeService`, so the pure-rxjs effect rule holds unchanged. The
slice initializes itself on the init action by asking the bridge, where one exists, for the current `ai` config.

**Why a slice and no Signal Store.** A download outlives the section that started it, and its work is effect-shaped: long-running, progress
arriving as pushed events, one action per event and one reducer per transition. The slice also holds the configuration those components act
on. That is the global store's stated criterion. `StartupStore` is a Signal Store for reasons that do not apply here — it is read before the
first navigation, by an app initializer and a route guard.

**The config is the truth; the slice is a read-through cache of it.** Every write goes out through the bridge and the slice updates from
what the bridge returns, never optimistically and never from the action's own payload. `config:apply` already behaves that way, and it is
what keeps ADR-002 honest.

**Consequences.**

- This is the first global slice fed by the bridge instead of by a generated API client. No OpenAPI change, no codegen, no backend change:
  `traquity-api` and `traquity-server-spring` are untouched by this whole epic.
- Purely local section state — which entry is expanded — stays a component concern.

## ADR-005: A machine capability probe, a requirement per model, and a verdict that warns instead of blocking

**Status:** accepted

**Context.** The verdict must be computed **before** any model exists on disk, so it can say nothing about a file. Answering the
machine's side of it without help means Electron's `app.getGPUInfo`, an `nvidia-smi` spawn and a per-platform guess at unified memory:
three unreliable sources for a question `node-llama-cpp` answers directly.

**Decision.** `node-llama-cpp` (MIT, as is the llama.cpp it wraps) is the sole source of the machine's side of the verdict. The main process
calls `getLlama()` once per start and reads `llama.gpu` for the resolved backend and `llama.getVramState()` for total and free VRAM.
**Loading the binding is not loading a model** — no weights are read and no context is allocated.

| `llama.gpu` | backend         | verdict basis                                   |
|-------------|-----------------|-------------------------------------------------|
| `'cuda'`    | CUDA            | reported VRAM against the requirement           |
| `'metal'`   | Metal           | reported VRAM (unified) against the requirement |
| `'vulkan'`  | not recognized  | `unsupported`                                   |
| `false`     | none — CPU-only | `unsupported` for every entry                   |

Requirements are catalogue constants, stated per entry for the largest context any planned usecase needs: `qwen-2b` 3 GB, `qwen-4b` 5 GB,
`qwen-9b` 11 GB. `GgufInsights` is not consulted.

A verdict is **`ok`, `unsupported` or `unknown`**. `getLlama()` failing — no prebuilt binary for the platform, a driver that refuses to
initialize — yields `unknown` for every entry and never an exception, and the section says so.

**A GPU backend is required by all three entries, the 2B included, so a CPU-only machine reads `unsupported` throughout.** The 2B is the one
where that is a judgement call and no obvious consequence of the VRAM figures: its weights are 1.28 GB, and generation on a current desktop
CPU would be usable.

**A verdict never blocks anything; it gates a confirmation.** `unsupported` leaves the download button enabled and puts the verdict and its
reason into a confirm dialog first, and activating such a model is equally permitted.

**Vulkan is detected and not recognized.** `node-llama-cpp` ships Vulkan prebuilts, so `llama.gpu` can legitimately report `'vulkan'` on an
AMD or Intel GPU, and `getVramState()` then answers for it.

**Consequences.**

- **A new dependency, and a native one.** `node-llama-cpp` is MIT and permissive-compatible, but it carries prebuilt binaries per platform
  and backend: packaging unpacks it from the asar, `licenses:generate` picks it up, and the installer grows.
- The probe is one `getLlama()` plus one `getVramState()`, so it is equally answerable on a machine with nothing downloaded.
- The verdict is derived and never persisted: a machine changes, and a stale verdict in `traquity.config.json` would outlive the truth.

## ADR-006: Download lifetime state stays in the `ai` slice, not in the settings section's Signal Store

**Status:** accepted

**Context.** `download` and `downloadErrors` are read by one component, `AiPageComponent`, and by nothing else. On reach alone they look
screen-local, and the AI section could own them in a Signal Store the way the configuration screen owns `javaDownload` in `ConfigureStore`.

**Decision.** In-flight download state stays in the `ai` slice, root-registered (`provideStore`/`provideEffects` in `app.config.ts`) and not
provided by the settings route. The criterion is **lifetime and not reach**: state owned in the main process beyond the screen's life, which
the screen cannot re-derive on remount, belongs to the slice however few components read it.

**Why.**

- **The main process owns the download throughout.** `ai:download` is one long-running `invoke` resolving only after transfer, hash check
  and install, with an `aiDownloading` mutex held for that whole span. The renderer holds a view of a lifetime it does not control.
- **It is not re-derivable.** `ai:getState` answers with the notice confirmation and the installed models; there is no "running at 43%" to
  ask for. That separates it from `javaVerification`, which `ConfigureStore` re-derives from `configure:getState` on every mount.
- **The failure mode is a bug.** Destroying a page-scoped store unsubscribes the `from(promise)` over the IPC call and cancels nothing: the
  download continues, the mutex stays held, and the remounted catalogue offers `showDownloadButton: true`. Pressing it answers that a
  download is already running — a failure message for a download that is working. ADR-003 leaves no cancel path, so the renderer cannot
  clear the mutex either. Weights are large enough that navigating away mid-download is the expected case.
- **The progress push is app-lifetime.** `ai:downloadProgress` arrives whenever the main process emits, and `trackAiDownloadProgress`
  subscribes once on `AppActions.initialize`.
- **The view model would split.** `getCatalogueSelector` joins `catalogue` + `models` with `download` + `downloadErrors`.

**Alternatives declined.**

- *A screen-scoped Signal Store, as `ConfigureStore` holds `javaDownload`.* That state belongs to a screen because the configuration screen
  *is* the app while it is up, its outcome feeds that screen's own `javaValid` gate, and it re-derives from the bridge on mount. The AI
  section has none of the three.

**Consequences.**

- Navigating away mid-download and returning shows current progress with no re-fetch — the root-registered effects were never torn down. A
  download finishing or failing while the user is elsewhere lands in the slice the same way.
- Nothing outside the AI section surfaces a running download. Whether that deserves a header indicator is left open.
- A renderer reload drops it, and nothing can recover it for the reason above. Closing that means having `ai:getState` report an in-flight
  download; worth a story if a reload is judged realistic, and it changes nothing here.
- ADR-004's "transient download progress" takes the shape `download: {key, progress} | null` plus `downloadErrors`, and no per-key map: the
  main process permits one download at a time, so a map would model a state that cannot occur.
- `downloadErrors` is arguable — losing it on navigation would be defensible. It stays because it is keyed by catalogue key and cleared by
  the reducer that starts a download.

## ADR-007: Inference runs in the main process, one request at a time, run to an outcome

**Status:** accepted

**Context.** ADR-005 already loads `node-llama-cpp` in the main process for the capability probe, which reads no weights and allocates no
context. A generation is a different proposition: seconds to minutes of work on the event loop that owns the window, the config file and the
backend spawn.

**Decision.** A model is loaded and prompted in the main process, and never in the renderer. One model is loaded at a time: a request loads
it, and the answer is followed by disposing the context and the model, so nothing stays resident between two prompts and no idle timer has
to decide when to unload. A second request arriving while one runs is rejected.

**No cancel**, for the reason ADR-003 gives for a download: a teardown path through the generation, the request and the caller's state buys
back a wait the caller can sit out.

**Every request names its model by catalogue key.** The caller sends the key, never a path and never nothing; `ai-registry.js` resolves it
to the config's entry and **checks only that a file exists at that path** — what the bytes there are is not its question. That is the whole
validation a request performs. The digest was verified once, at download time (ADR-003), and re-hashing 1.3–6.2 GB into every extraction
would cost seconds per prompt.

**Why the key and no process-side idea of "the active model".** ADR-002 makes the active flag hand-editable and resolves a multi-active file
as the config enters the slice. A request carrying the key keeps that one choice in one place instead of re-deriving it behind the bridge,
where it could disagree. It also makes a second model a caller-side change: pointing one usecase at a different key needs no new channel, no
config shape and nothing here.

**Why not the renderer.** Prompt resolution (ADR-010), the grammar (ADR-011) and the model's lifetime need one owner, and the weights sit on
a disk path the renderer has no business reading.

**Alternatives declined.**

- *A `utilityProcess` the main process spawns.* It starts a second copy of the application per extraction in a packaged build, with a window
  and a wiped log.
- *A `utilityProcess`, with the library's fork patched.* A stand-in for the binary test's four-message exchange, pinned to the version's
  internals, was built and worked. Declined as a thing to carry: nothing checks it against an upgrade, and it silently disables a crash
  guard.
- *A `utilityProcess`, with a single-instance guard.* The second copy quits before showing a window, but the binary test then fails, and a
  failed test makes `getLlama` skip the whole CUDA candidate and fall back to a slower backend. It trades a visible flicker for a silent
  loss of GPU acceleration.

**Consequences.**

- One request/response channel per usecase, each through `ipc/trusted-sender.js` with a bounded `ipc/ipc-schema.js` entry.
- A key with no entry, or an entry whose file has gone, is a failed request — the same state a removed or hand-moved model produces
  everywhere else, so nothing new has to model it.
- The key also picks the model-specific prompt layer (ADR-010), so one argument decides both the weights and the prompt.
- A cold load costs seconds to tens of seconds, so the bridge distinguishes **loading** from **generating**; a caller that cannot tell them
  apart shows a wait that reads as a hang.
- **A crash in the native binding takes the application down**, where a child process would have absorbed it and left the failure
  reportable. This is the price of the decision. What makes the exposure acceptable is that the library's own binary test runs the way it
  intends, which is what the declined alternatives break.
- **The weights are released by `dispose` and by nothing else.** A child process would have returned them by exiting, for free; the process
  chosen here outlives every extraction, so the `finally` blocks around the context and the model are the only thing that gives gigabytes
  back to the machine. A path added there that leaves either undisposed leaks for the rest of the run.
- **That a generation leaves the JavaScript thread free is a property of the library** and no property of this application. A version
  moving evaluation onto that thread invalidates the premise, and the symptom is a main process that stops answering IPC for the length
  of a generation.

## ADR-008: PDF parsing runs in the renderer

**Status:** accepted

**Context.** A broker PDF is the input of the document-extraction usecase, and it is attacker-controllable.

**Decision.** `pdfjs-dist` runs **in the renderer**, called directly by the screen that took the file. Only the extracted document model
(ADR-009) crosses the bridge; a file's bytes never do.

**Why.** A parse is the one step of this domain with no prompt, no model and no lifetime: a file goes in, a document model comes out, and
every way it can fail — a file that is not a PDF, an encrypted one, a scan with no text layer — is a message the user reads on the screen
they are standing on. Keeping the parse there keeps the failure where it is reported. Moving it behind the bridge turns each of those into
an IPC result type, a schema entry and an error string threaded back through a channel, for a step that gains nothing from the trip.

**Alternatives declined.**

- *Parsing where inference runs (ADR-007).* It buys the parse whatever isolation that process has and costs the error handling.
- *Parsing in a Java library.* Puts the extraction on the far side of an HTTP boundary from the model that consumes it, for no gain, and
  contradicts ADR-004's "no AI surface in the backend".

**Consequences.**

- `pdfjs-dist` (Apache-2.0, pure JS, no native binary) joins the client's **`devDependencies`**, where every other renderer library sits.
  The `dependencies` block means something narrower here: what the packaged main process resolves out of `node_modules` at runtime, since
  electron-packager prunes `devDependencies` from the asar. A renderer library is bundled by `ng build` and resolved from nothing.
- **Attribution is unaffected.** `ng build` writes `3rdpartylicenses.txt` for every package that lands in the bundle, and
  `generate-third-party-licenses.js` reads that file first — the dependency block is only how it finds the *shell's* runtime closure.
- **The hostile-input rule is this path's own to honor.** A parse behind a process boundary would have inherited that process's isolation;
  this one has none of its own, so pdf.js runs with `isEvalSupported: false`, and nothing it returns reaches a template except through the
  form fields it fills. Those fields have their own input validation.
- A malformed document that hangs the parse blocks the window, which a child process would have absorbed. The parse is therefore bounded —
  a page count, a run count and a time budget — and a document exceeding any of them is refused with that as the reason.
- **What crosses the bridge is bounded in `ipc/ipc-schema.js`**: the rendered text by its total length, and the tokens (ADR-013) by how
  many a document may state and how long one of them may be.
- The extraction stages live in a module of their own with their own spec, and not in the component that happens to call them first.

## ADR-009: PDF text is extracted with its coordinates, never flattened

**Status:** accepted

**Context.** A settlement puts a label and its value on **exactly the same baseline**, and that shared baseline is the only thing saying
the two belong together. Flattening the page to text throws it away and leaves reading order in its place, so a value column that starts
one row below its labels hands every label its predecessor's value: `Zahlbarkeitstag` loses its own, and nothing about the result looks
wrong. A model reading that transcription answers confidently from it, and the fields it gets wrong are the ones an import gets wrong
silently.

**Decision.** Extraction produces a **geometric document model**, never a flattened text dump, in five deterministic stages:

1. **Runs** — `getTextContent()` per page, each item with `x`, `y` (flipped so a smaller number is higher), `width`, `height`, `fontName`.
2. **Join** adjacent runs on one baseline whose boxes touch. Necessary and not cosmetic: one broker splits `Limit-Order` into `"Limit-Orde"`
   and `"r"`, another emits nearly every word as its own run.
3. **Rows** — cluster by baseline with a tolerance proportional to font height, never a fixed epsilon and never a page-global row grid.
4. **Cells** — within a row, split where the horizontal gap exceeds a fraction of the font size, so column bands are per row.
5. **Normalize** — a trailing-sign amount (`216,05-`) or braces (`(216,05)` for a negative value) to a signed decimal, and a neighbouring
   cell carrying the currency the caller asked for (ADR-011) to that amount's currency. That one code is the only one recognised: a
   settlement prints `STK` in front of a quantity, `MIC` behind a venue and `HRB` in front of a register number, so reading three upper-case
   letters as a currency would attach one to each of those numbers.

The model then receives a rendering of that document model — one line per printed row, ` | ` between the cells of that row — in which a
label and its value are adjacent because the printer put them there.

**Alternatives declined.**

- *A flattened text dump.* The subject of this ADR.
- *A vision model over page images.* Roughly doubles the memory footprint to infer what stages 1–5 derive exactly. The problem is
  geometry the page states and no perception problem.
- *Prompting around the scrambling.* No instruction restores an association the transcription destroyed: the text the model reads no
  longer says which value belongs to which label, and a rule for recovering it would be a rule about one broker's column order.

**Consequences.**

- **A PDF with no text layer (a scan, say) is refused with that as the reason.** No OCR: it would be a second model, a second download and a
  second class of error. It is detectable in stage 1 — a page with no runs.
- A text layer can be lossy in ways geometry cannot repair (one examined document is missing a glyph from a word in its header), so the
  extractor must not assume the layer is complete.
- Extraction quality is a property of a broker's layout, and brokers differ enough that supporting one is a question about that layout and
  no question of changing code. Stage 5 also takes the page's own notation off the model's plate.

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

- *A database table.* Tuning would mean the H2 console, and every shipped tweak a migration. It also sits behind Java, which ADR-004 rules
  out for this domain.
- *Packaged resources only.* Blocks tuning without a rebuild.

**Consequences.**

- **Layer 4 is what makes the resolution total, and it is a packaging invariant and no fact about the running system.** A packaged
  `default.md` ships for every usecase, so a request normally cannot fail to find a prompt. A build that shipped without one, or an install
  someone edited, breaks that. The resolver therefore treats "no layer answered" as a failed request naming the usecase whose prompt is
  missing, and never runs the model on an empty system prompt: a wrong answer produced with no instructions is worse than a stated failure.
- `default.md` is the file that serves the most models, and a `<model>.md` exists only where a model needs one of its own. One is deleted
  once it stops earning its place. Transaction extraction ships none.
- Renaming a catalogue key (ADR-002) orphans any model-specific override for it. Layer 2 or 4 then answers, so behavior stays correct and
  the file silently stops being consulted — which is why the app must report **which layer resolved** a request. The failure mode of an
  override is forgetting one is in place and debugging the wrong prompt.
- **No shipped prompt names a vendor or a company.** Prompts stay abstract so the app's whole audience benefits from them; power users are
  invited to tune their own under the rules above.

## ADR-011: For PDF import, the model emits one grammar-constrained JSON object, and it writes nothing

**Status:** accepted

**Context.** The model could be given tools and allowed to drive a loop, including database mutation.

**Decision.** It is not. The model gets exactly one job per invocation: produce JSON matching a grammar (GBNF / JSON-schema constrained
decoding), for one document, in one context discarded afterwards. **No endpoint that mutates the database is reachable from it** — no
`POST`, `PUT`, `PATCH` or `DELETE`. Resolution, validation and persistence happen afterwards in deterministic code, and the result is a
draft a human confirms before anything is written.

**The model names the page's own values, and states none of them.** Every field of the answer is a **token id**, and the grammar admits
only the ids of tokens stage 5 of ADR-009 read: one id for the date, the time and the quantity, a list of ids for each monetary field,
since a page states as many tax and fee lines as it likes. The transaction's type is the one thing the answer states in its own words,
because the page states it in prose and no token carries it.

A value the model cannot restate is a value it cannot corrupt: an id resolves to the value the tier that parsed the page read, in that
tier's notation, with the label and the currency it was printed with.

**The fields name what a broker line is, and no field of `TransactionCreate`.** Postprocessing maps the one onto the other, so the app's own
type can change without moving what the model does, and a field added later is one field in the answer and one rule in that mapping.

**The question put to the model is which values a field takes, and never what a value is.** Asked to name the gross, a model compares the
candidates and picks; asked of each amount in turn whether it is the gross, it has nothing to compare and answers far worse. The field is
therefore the unit of the question, and the id list is what makes that expressible without letting a value be invented.

**The extraction takes a currency as an input, and only an amount denoted in that one is marked as denoted at all.** A dividend printing a
foreign amount and its converted counterpart states each figure twice, and taking both is how a total silently doubles. Stage 5 attaches
the requested code to an amount printed beside it and attaches nothing to an amount printed beside another, and the message names the
currency before the page so the rule is read before the text it governs.

**This is a marking and no filter.** A foreign amount stays a token the model may sort: the figures of a page are not separable into
currencies without deciding which column of a conversion is which, and a token sorted wrongly is the price of never dropping one that
should have been kept. The marking plus the prompt is what keeps the two apart, so a document printing its currency as a symbol and never
as a three-letter code is a document this distinction does not reach.

**Alternatives declined.**

- *Tools and a multi-step agent loop.* Declined for reliability: a 2B–9B model emitting well-formed calls, reading results and looping
  correctly across many documents is optimistic, and a feature producing output the user must discard half the time is not useful.
- *Post-hoc validation in place of a grammar.* It turns an impossible output into a rejected one, which needs the retry loop the grammar
  removes.

**Consequences.**

- Constrained decoding guarantees parseable output, so there is no retry-on-malformed-JSON path.
- **The grammar is not the last check.** It constrains shape and says nothing about sense — a generated artifact goes through the same
  validation a file picked off disk does, and then in front of a human. Grammar for shape, schema for validity, human for sense.
- **The extractor becomes the ceiling.** A value ADR-009 missed is a value the model cannot emit. That is the right trade — a missing field
  shown as empty beats a plausible invented one — and it makes extractor coverage another bottleneck.
- One invocation per document costs nothing: no cross-document state, no context pressure, graceful degradation on weaker models.
- Where a target type carries one summed field, the model states the lines it attributes to that field and `transaction-extraction.js` adds
  them up. Asking for the sum instead asks the model to do arithmetic, where selecting lines asks it only to read; the addition then
  happens in code, in fixed point. The lines are safe to collect only because of the currency rule above; without it, the
  foreign-currency duplicate of a tax line enters the total.

## ADR-012: A changed system prompt releases as a patch, the first prompt for a usecase as a minor

**Status:** accepted

**Context.** ADR-010 makes prompts packaged files versioned with the release, and calls them the artifact this domain iterates on most. A
release whose entire content is a reworded instruction is therefore plausible here, and `CHANGELOG.md` commits the project to semver.
`architecture/api.md`'s ADR-013 fixed how one shipped artifact maps onto that; prompts need the same statement, because without one every
tuning round is arguable in both directions.

**Decision.** The release class follows what a prompt change does to the app's surface:

- **Editing a packaged prompt is a patch.** Rewording, restructuring, adding or dropping an instruction, replacing an example — whatever it
  does to the quality of the answers. Adding a `prompts/<usecase>/<model>.md` where layer 4's `default.md` already answered is the same
  case, and so is deleting one once it stops earning its points (ADR-010): the usecase already answered on that model, and what moved is how
  well.
- **Shipping the first packaged prompt for a usecase is a minor.** Layer 4 is what makes ADR-010's resolution total, so a usecase with no
  packaged `default.md` fails every request naming its missing prompt. The file that turns "this feature reports it has no prompt" into
  "this feature answers" adds functionality. A new usecase also needs UI and an IPC channel around it, so a new `default.md` by itself
  changes nothing about how users engage with AI in this app.

**Why an improved prompt is no minor.** A prompt is not surface. After a reworded system prompt the app offers the same screens, IPC
channels, catalogue keys and JSON shape — ADR-011 pins that shape to a grammar, so even the extraction's output type is unmoved. There is
nothing a caller can do afterwards that it could not do before; what changed is how often the draft in front of the user is right, on a path
where a human confirms every value anyway. Classifying that as a minor would make the minor version a count of tuning rounds, which tells a
reader nothing about compatibility and hides the additions that do matter.

**Nothing in a prompt can force a major.** Model output is not a compatibility surface. Two releases answering one document differently is
the expected outcome of tuning and never a breach: the grammar bounds what may come out, and the values inside it were never promised to be
stable across versions. A prompt also sits behind the bridge, so no third party can address it. A major stays what `architecture/api.md`'s
ADR-013 makes it — a recorded convention broken on purpose.

**Alternatives declined.**

- *Every added packaged prompt file is a minor, whichever layer it sits in.* Mechanical and cheap to apply, and wrong on the case it
  decides: a `<model>.md` written because the shared default underperforms on one model is an improvement to a shipped usecase, and shipping
  the identical improvement by editing `default.md` would then be a patch. The version would depend on which file the fix landed in.

**Consequences.**

- A prompt-only release is a patch, and it appears under `Changed` in `CHANGELOG.md`. It is a user-visible improvement to a feature, so it
  is worth a line there even though the version's third component is all that moves.
- **The minor half of this rule rarely fires by itself.** A new usecase's `default.md` ships with the code that calls it, and that code is
  already a minor.
- **On-disk overrides are outside this entirely.** Layers 1 and 2 are user files, carry no version, and keep winning after a patch rewrote
  the packaged file underneath them. That is ADR-010's "debugging the wrong prompt" failure mode with a version number attached, and it is
  why a report against a patch has to name which layer resolved the request.
- Changing the AI model catalogue is a different question and no scope of this ADR.
- A prompt edit that only works together with a code change — a field the grammar has to allow (ADR-011), a value an extraction stage has to
  produce first (ADR-009) — is classified by that code. The prompt is then part of a larger change and not the change itself.

## ADR-013: A page's notation is read exactly once, in the tier that parsed the page

**Status:** accepted

**Context.** ADR-008 puts the parse in the renderer and ADR-011 builds the grammar out of the document's own tokens. The bridge between
the two carries **text**, and that leaves one question open: a printed `1.005,00` can be read into a number by the tier that parsed the
page, or again by the tier that generates the grammar, and both are able to. Unless the question is settled it gets answered twice — two
implementations of one domain, each ahead of the other on whichever notations its own author met, and nothing anywhere checking that they
agree.

A disagreement between them is asymmetric, and both halves are bad. A value the **parsing** tier cannot read loses its label and reaches
the model as bare text in a row. A value the **grammar** tier cannot read gets no slot at all, and a value with no slot is one the answer
has no way to carry.

**Decision.** The renderer states what the document states: every value, and the security the page names. `tokensOfDocument` walks the
tokens stage 5 of ADR-009 produced and returns each as an id, a kind, the text as printed, the value in the notation an answer uses, the
label naming it and the currency it is denoted in. The extraction request carries that **as typed JSON beside the rendered text**, so the
tier building a grammar out of it parses nothing. **No notation is read in the main process at all.**

Each reader in `src/common/pdf/` has two levels over one implementation: `readingsOf<X>` enumerates every reading a notation admits,
`parse<X>` takes the likelier one, and a token carries that one. Where a notation is genuinely ambiguous the code commits and the model is
never asked, since which reading a page means is a property of the page and no judgement about the transaction.

**Alternatives declined.**

- *A reader in each tier, tested against one shared fixture list.* The cheapest option, and it leaves every future notation a two-file edit
  in two languages, enforced by a test someone has to remember instead of by there being one place to edit.
- *Sharing the modules across the tiers.* Compiling `src/common/pdf/` to CommonJS and requiring it from `electron/` is possible, and it
  costs a build step before a suite that otherwise needs nothing but `npm ci`, an entry in `forge.config.js`'s allowlist, and build-order
  coupling between the two tiers. It also keeps the re-derivation and only makes two copies
  agree, where having one makes the question go away.

**Consequences.**

- **The main process holds no notation reader and no masking pass.** Masking is what a regex scanning flat text needs so the digits of a
  date are not read a second time as a number of their own; a token model knows what each word is, so the question does not arise.
- **The page guarantee is the one ADR-011 asks for.** The slots are over the tokens stage 5 produced, which is the document model and not
  a rendering of it. A scanner over flat text offers substrings of words that state no value at all — `883.04050812` out of
  `0883.04050812.0003951OR07` — as amounts a model may pick. Every slot is a value the page states.
- **The tokens cross the bridge and are therefore untrusted input**, bounded in `ipc/ipc-schema.js` like everything else there: how many a
  document may state and how long each field of one may be, both about what llama.cpp is asked to compile. No authority is handed over by
  this — the text those tokens were read from comes from the renderer too.
- **A reading is taken off one document in one call** (`readingOfDocument`), so text, tokens and security describing two different
  documents is not something a caller can assemble by accident.
- **The security follows the same rule.** An ISIN is something the page states, so `isinOfDocument` reads it in the renderer — which is also
  its only consumer, resolving it against the securities it holds. It is no part of the answer: the grammar has no `isin` rule and the
  answer schema refuses the key. **The main process reads nothing off a document at all.**
- **Coverage is one gap in one place.** A notation this tier cannot read is a value no field of the answer can carry, and that is
  answerable witho/ut loading a model: whether the generated grammar can state a given value at all is a property of the tokens alone.
