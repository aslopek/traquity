# AI

## ADR-001: AI is a settings section behind a one-time notice confirmation

**Status:** accepted

**Decision.** AI model management is a section of the settings page, an accordion panel beside the others, shown only where the bridge to
the main process exists — so it disappears in a browser-only dev run. The section renders a notice that must be confirmed before AI can be
configured and used; among other things, users confirm that neither TraQuity nor the models give financial advice. `Confirm` unlocks the
section, and it stays unlocked on this machine until the notice changes.

**The notice is one static HTML file, and its sha256 is the confirmation token.** Packaging copies that file into the Electron resources
beside the backend jar, so the main process holds the exact bytes the UI displays. `ai:confirm` therefore takes **no arguments**: the main
process hashes the resource and writes the digest. The section is unlocked while the stored digest equals the packaged file's, so **every
changed character re-asks** — consent is asked again if and only if the notice itself changes.

**Consequences.**

- The bridge hands the UI a boolean, never a digest to compare.
- Reformatting the file or fixing a typo re-asks for consent.

## ADR-002: The `ai` key in `traquity.config.json` is the truth, and it is hand-editable

**Status:** accepted

**Decision.** One top-level `ai` object, alongside `env`, `auth` and `java`:

```json
{
  "ai": {
    "confirmedNotice": "<sha256 of the packaged notice file, as confirmed>",
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
is the state. A model's own `path` is the only thing that locates it: **no download directory is remembered**, and a model moved by hand
keeps working once its `path` moves with it.

**Why the Electron config and not the DB-backed app config.** What is on this disk is per-machine; DB client config is per-database and
would travel to a machine where none of these files exist. Same reason `auth` and `java` live here.

**Only one model may be `active`, and the app copes when the file says otherwise.** Users edit this file by hand, so two `active` entries
can happen. Reading the config into the slice picks the first `active` entry and treats every other one as inactive. The file on disk is
left untouched, only the state is corrected, and it happens **once, at read time** — never in a selector, which stays pure and memoizable.
The picked model therefore stays the same for the whole session.

**Consequences.**

- Validation is per entry: one mangled model entry makes that model read as not installed while the rest of the file loads.
- A `path` pointing at a file that is gone reads as not installed, and the entry is what the next download overwrites.
- `confirmedNotice` is the only key written before a download exists, so the first `Confirm` creates the `ai` key. The schema takes a base64
  sha256; anything else — a hand-edited value included — reads as unconfirmed and never as a broken config.

## ADR-003: Downloads reuse the Corretto download's shape — pinned, verified, and not interruptible

**Status:** accepted

**Context.** The bundled Java runtime's download solves this problem once already, and every bound in it applies harder to a 6.2 GB file:
the byte cap enforced on the stream and never on a `content-length` the sender wrote, the staging directory so a failure leaves what was
there intact, the `https:`-only redirect check, the removal retries for a directory a virus scanner is busy with. Streaming a file into a
hash to verify it is likewise something the main process already does.

**Decision.** A download resolves the pinned `resolve/<revision>/<file>` URL into a staging file beside the final one in the chosen model
directory, capped at the catalogue's exact byte count plus a small margin, hashed as it is written and compared against the pinned digest,
and renamed into place only once the two match. A mismatch is a failed download: the staging file is removed and no config entry is written.
Progress is pushed on its own channel, in the shape the Java download's progress channel already has, and rendered by the same progress
display.

**No cancel, no pause, no resume.** A download runs to completion or fails. Resume needs range requests and a partial-file state in the
config; cancel needs a teardown path through the stream, the staging directory and the slice. Neither is worth the complexity.

**Consequences.**

- The catalogue is a constant of the main process, shared with the UI through the bridge and never duplicated there.
- A repeated download of the same model replaces what is there.

## ADR-004: A global `ai` store slice, read through the bridge

**Status:** accepted

**Decision.** A global `ai` NgRx slice. It holds the notice confirmation, the catalogue, what is installed per key, which model is active,
the machine's verdict per entry (ADR-005) and transient download progress. Its effects reach the main process through a bridge service of
its own, shaped like the one the startup flow uses, so the pure-rxjs effect rule holds unchanged. The slice initializes itself on the init
action by asking the bridge, where one exists, for the current `ai` config.

**Why a slice and no Signal Store.** A download outlives the section that started it, and its work is effect-shaped: long-running, progress
arriving as pushed events, one action per event and one reducer per transition. The slice also holds the configuration those components act
on. That is the global store's stated criterion.

**The config is the truth; the slice is a read-through cache of it.** Every write goes out through the bridge and the slice updates from
what the bridge returns, never optimistically and never from the action's own payload.

## ADR-005: A machine capability probe, a requirement per model, and a verdict that warns instead of blocking

**Status:** accepted

**Context.** The verdict must be computed **before** any model exists on disk, so it can say nothing about a file. Answering the machine's
side without help means Electron's GPU info, an `nvidia-smi` spawn and a per-platform guess at unified memory: three unreliable sources for
a question `node-llama-cpp` answers directly.

**Decision.** `node-llama-cpp` (MIT, as is the llama.cpp it wraps) is the sole source of the machine's side of the verdict. The main process
loads the binding once per start and reads the backend it resolved to, plus the total VRAM that backend reports.
**Loading the binding is not loading a model** — no weights are read and no context is allocated.

| resolved backend | verdict basis                                   |
|------------------|-------------------------------------------------|
| CUDA             | reported VRAM against the requirement           |
| Metal            | reported VRAM (unified) against the requirement |
| Vulkan           | not recognized — `unsupported` for every entry  |
| none — CPU-only  | `unsupported` for every entry                   |

Requirements are catalogue constants, stated per entry for the largest context any planned usecase needs.

A verdict is **`ok`, `unsupported` or `unknown`**. The binding failing to load — no prebuilt binary for the platform, a driver that refuses
to initialize — yields `unknown` for every entry and never an exception.

**A verdict never blocks anything; it gates a confirmation.** `unsupported` leaves the download button enabled and puts the verdict and its
reason into a confirm dialog first, and activating such a model is equally permitted.

Vulkan is the one backend that is detected and then not recognized: `node-llama-cpp` ships Vulkan prebuilts, so the binding can legitimately
resolve to it on an AMD or Intel GPU and answer for its VRAM.

**Consequences.**

- **A new dependency, and a native one.** `node-llama-cpp` is MIT and permissive-compatible, but it carries prebuilt binaries per platform
  and backend: packaging unpacks it from the asar, license collection picks it up, and the installer grows.
- The verdict is derived and never persisted: one written into `traquity.config.json` would outlive an upgraded machine, or be copied onto
  another one.

## ADR-006: Download lifetime state stays in the `ai` slice, not in the settings section's Signal Store

**Status:** accepted

**Context.** In-flight download state — which model is transferring, how far it has got, and which downloads failed — is read by the AI
settings section and by nothing else. On reach alone it looks screen-local, and the AI section could own it in a screen-scoped Signal Store
the way the configuration screen owns its Java download.

**Decision.** In-flight download state stays in the `ai` slice, registered at the app's root and not provided by the settings route. The
criterion is **lifetime**: state owned in the main process beyond the screen's life, which the screen cannot re-derive on remount, belongs
to the slice however few components read it.

**Why.**

- **The main process owns the download throughout.** `ai:download` is one long-running request resolving only after transfer, hash check
  and install, with a mutex held for that whole span. The UI holds a view of a lifetime it does not control.
- **It is not re-derivable.** `ai:getState` answers with the notice confirmation and the installed models; there is no "running at 43%" to
  ask for. That separates it from the Java verification, which the configuration screen re-derives on every mount.
- **The failure mode is a bug.** Destroying a page-scoped store unsubscribes from the IPC call and cancels nothing: the download continues,
  the mutex stays held, and the remounted catalogue offers a download button again. Pressing it reports that a download is already running —
  a failure message for a download that is working. ADR-003 leaves no cancel path, so the UI cannot clear the mutex either, and weights are
  large enough that navigating away mid-download is the expected case.
- **The progress push is app-lifetime.** `ai:downloadProgress` arrives whenever the main process emits, and it is subscribed once when the
  app initializes.
- **The view model would split.** What the catalogue renders joins the configured models with the download running against them, so a
  screen-scoped half would have to be merged back in wherever that catalogue is shown.

**Alternatives declined.**

- *A screen-scoped Signal Store, as the configuration screen holds its Java download.* That state belongs to a screen because the
  configuration screen *is* the app while it is up, its outcome gates that screen's own finish buttons, and it re-derives from the bridge
  on mount. The AI section has none of the three.

**Consequences.**

- The download progress can be shown, e.g. in the app header, even when navigating away

## ADR-007: Inference runs in the main process, one request at a time, run to an outcome

**Status:** accepted

**Context.** ADR-005 already loads `node-llama-cpp` in the main process for the capability probe, which reads no weights and allocates no
context. A generation is a different proposition: seconds to minutes of work on the event loop that owns the window, the config file and the
backend spawn.

**Decision.** A model is loaded and prompted in the main process, and never in the UI. One model is loaded at a time: a request loads it,
and the answer is followed by disposing the context and the model, so nothing stays resident between two prompts and no idle timer has
to decide when to unload. A second request arriving while one runs is rejected.

**No cancel**, for the reason ADR-003 gives for a download: a teardown path through the generation, the request and the caller's state
brings more complexity than usability.

**Every request names its model by catalogue key.** The caller sends the key, never a path and never nothing; the main process resolves it
to the config's entry and **checks only that a file exists at that path**. That is the whole validation a request performs: the digest was
verified once, at download time (ADR-003), and re-hashing 1.3–6.2 GB into every extraction would cost seconds per prompt.

**Why the key and no process-side idea of "the active model".** ADR-002 makes the active flag hand-editable and resolves a multi-active file
as the config enters the slice. A request carrying the key keeps that choice in one place instead of re-deriving it behind the bridge, where
it could disagree. It also makes a second model a caller-side change: pointing one usecase at a different key needs no new channel and no
config shape.

**Why not the UI.** Prompt resolution (ADR-010), the grammar (ADR-011) and the model's lifetime need one owner, and the weights sit on a
disk path the UI has no business reading.

**Alternatives declined.**

- *A `utilityProcess` the main process spawns.* It starts a second copy of the application per extraction in a packaged build, with a window
  and a wiped log.
- *A `utilityProcess`, with the library's fork patched.* Declined as a thing to carry: nothing checks it against an upgrade, and it silently
  disables a crash guard.
- *A `utilityProcess`, with a single-instance guard.* The second copy quits before showing a window, but the binary test then fails, and a
  failed test makes the library skip the whole CUDA candidate and fall back to a slower backend. It trades a visible flicker for a silent
  loss of GPU acceleration.

**Consequences.**

- One request/response channel per usecase, each behind the sender check and the bounded schema entry every channel carries.
- The key also picks the model-specific prompt layer (ADR-010), so one argument decides both the weights and the prompt.
- **A request is one call and carries no progress.** A cold load costs seconds to tens of seconds and the generation longer still, so a
  screen can show that something is running and not what. Telling **loading** from **generating** would need a push channel this decision
  does not add; both are named in the log instead.
- **A crash in the native binding takes the application down**, where a child process would have absorbed it. That is the price of the
  decision, and what makes it acceptable is that the library's own binary test runs the way it intends — which is what the declined
  alternatives break.
- **A path out that leaves the context or the model undisposed leaks for the rest of the run**, in a process that outlives every extraction.
- **That a generation leaves the JavaScript thread free is a property of the library**, not of this application. A version moving evaluation
  onto that thread invalidates the premise, and the symptom is a main process that stops answering IPC for the length of a generation.

## ADR-008: PDF parsing runs in the UI

**Status:** accepted

**Context.** A broker PDF is the input of the document-extraction usecase, and it is attacker-controllable.

**Decision.** `pdfjs-dist` runs **in the UI**, called directly by the screen that took the file. Only what was read off the document
(ADR-009) crosses the bridge; a file's bytes never do.

**Why.** A parse is the one step of this domain with no prompt, no model and no lifetime: a file goes in, a document model comes out, and
every way it can fail — a file that is not a PDF, an encrypted one, a scan with no text layer — is a message the user reads on the screen in
front of them. Moving it behind the bridge turns each of those into an IPC result type, a schema entry and an error string threaded back
through a channel, for a step that gains nothing from the trip.

**Alternatives declined.**

- *Parsing where inference runs (ADR-007).* It buys the parse whatever isolation that process has and costs the error handling.
- *Parsing in a Java library.* Puts the extraction on the far side of an HTTP boundary from the model that consumes it, for no gain, and
  gives the backend an AI surface this domain deliberately keeps out of it.

**Consequences.**

- `pdfjs-dist` (Apache-2.0, pure JS, no native binary) joins the client's **`devDependencies`**, where every other UI library sits. The
  `dependencies` block means something narrower here: what the packaged main process resolves out of `node_modules` at runtime, since
  electron-packager prunes `devDependencies` from the asar. A UI library is bundled by `ng build` and resolved from nothing.
- **The hostile-input rule is this path's own to honor.** A parse behind a process boundary would have inherited that process's isolation;
  this one has none, so the parser runs with its eval support switched off, and nothing it returns reaches a template except through the
  form fields it fills, which validate their own input.
- A malformed document that hangs the parse blocks the window, which a child process would have absorbed. The parse is therefore bounded —
  a page count, a run count and a time budget — and a document exceeding any of them is refused with that as the reason.
- **What crosses the bridge is bounded by the IPC schema**: the rendered text by its total length, and the tokens (ADR-013) by how many a
  document may state and how long each field may be — the prose naming a value is a whole row, so it needs a wider bound than the figure it
  names.

## ADR-009: PDF text is extracted with its coordinates, never flattened

**Status:** accepted

**Context.** A settlement puts a label and its value on **exactly the same baseline**, and that shared baseline is the only thing saying the
two belong together. Flattening the page to text throws it away and leaves reading order in its place, so a value column starting one row
below its labels hands every label its predecessor's value. A model reads that transcription without noticing, and the fields it gets wrong
are the ones an import gets wrong silently.

**Decision.** Extraction produces a **geometric document model**, never a flattened text dump, in five deterministic stages:

1. **Runs** — the text runs a page's text layer states, each with its position, its size and the font it is set in, the vertical axis
   flipped so that a smaller number is higher on the page, and a run carrying nothing but whitespace dropped.
2. **Join** adjacent runs on one baseline whose boxes touch into one word.
3. **Rows** — cluster by baseline with a tolerance proportional to font height, never a fixed epsilon and never a page-global row grid. The
   comparison is against the row opened last, which is what keeps a value column sitting a little below its labels attached to them.
4. **Cells** — within a row, split where the horizontal gap exceeds a fraction of the font size, so column bands are per row. It is the
   measure stage 2 uses at a wider threshold: gluing a split word and separating two columns are one question at two scales, so the two are
   decided together. A run drawn as a rule, a leader or a fill — `@@@@…` across a page, a row of dots leading to a page number, the
   underscores padding a column — carries nothing, is dropped, and separates whatever stood on either side of it.
5. **Values** — each word of a cell is asked what it is: a number, a date, a time, or none of the three. A word that is one of them becomes
   a **token**, and a word that is none stays plain text.

**A token keeps the text exactly as printed and carries the reading beside it.** The page's own notation is what the rendering shows and
what a later tier can check a value against; the normalized reading travels alongside it, never in its place. Along with it a token carries
what the page printed around the value:

- **The sign, apart from the magnitude.** A settlement marks the direction of a booking against the digits (`216,05-`, `-264,60`), as a
  word of its own on either side (`- 264,60`, `0,58 -`), or in the accounting notation's braces (`(216,05)`). None of them states the
  direction of the *transaction* — that is carried by its type — so magnitude and sign stay two fields.
- **The currency, which is an input to stage 5 and no reading of it.** The extraction names the one code its answer may be denoted in, and a
  token is marked where exactly that code stands beside the figure — on either side, past a sign between the two, and across the boundary
  into a neighbouring cell. **No other word is a currency**, which keeps `STK` in front of a quantity, `MIC` behind a venue and `HRB` in
  front of a register number from denoting a number each, and leaves the foreign half of a converted row unmarked. The quoted half of an
  exchange-rate pair denotes nothing either: what follows it is a rate and no amount in either currency.
- **The text naming the value** — what stands in front of it inside its own cell, or the cell to its left where the value opens the cell,
  and never further, since one row crosses unrelated column blocks.

A word reading as two kinds at once yields one token per kind: which of them a page means is a question about the page and no question the
notation answers.

**The model's message is built from that document model and never from the file**, out of two things derived from it side by side:

- a **rendering** — one line per printed row, a pipe between the cells of that row, a heading where more than one page is rendered — in
  which a label and its value are adjacent because the printer put them there;
- the **tokens** of stage 5, listed in printed order, which are what an answer names (ADR-011, ADR-013).

**Alternatives declined.**

- *Normalizing in place — the printed text replaced by its canonical form, an amount and its sign folded into one signed decimal.* The
  rendering then states something the document does not, so neither a reader nor a later tier can hold the two against each other, and two
  facts (how much, in which direction) fuse into one field for no gain. Carrying the reading beside the printed text costs one field per
  token and keeps both.
- *A table of the codes ISO 4217 assigns, so each amount carries whichever currency its own page printed.* It reads the page faithfully, and
  a table is what that takes: `STK` in front of a quantity, `MIC` behind a venue and `HRB` in front of a register number are three-letter
  upper-case words a settlement prints, and only a list of assigned codes keeps those from denoting a number apiece. The objection is not
  that the table is wrong but that nothing consumes its answer: the transaction has exactly one currency, known before the file is opened,
  and every consumer asks only whether a figure is in that one. Handing the code in answers that with a comparison.
- *A vision model over page images.* Roughly doubles the memory footprint to infer what stages 1–5 derive exactly. This is geometry the page
  states and no perception problem.
- *Prompting around the scrambling.* No instruction restores an association the transcription destroyed: the text no longer says which value
  belongs to which label, and a rule for recovering it would be a rule about one broker's column order.

**Consequences.**

- **A document whose pages state no run at all (a scan, say) is refused with that as the reason.** No OCR is involved, and broker documents
  are unlikely to be image-based.
- **The tolerances of stages 2 to 4 are tuned constants.** No test can tell a good split from a bad one, so they are fixed against real
  documents, and one changed by hand is a regression a test suite cannot catch.
- **The model is read per currency, and one parse serves one currency.** The same file read against another code marks other figures, so the
  document model is a reading of a page *for a transaction* and no neutral transcription, and nothing about it may be cached across two
  requests that disagree on the currency.
- **"Another currency" and "denoted in nothing" become one state.** Only the requested code marks anything, so the foreign half of a
  converted payment is indistinguishable from a rate, a quantity or a reference number. The model no longer records that a code stood beside
  a figure at all, so no later tier can recover the distinction and none may assume it — what depends on telling the two apart is ADR-011's
  to carry.

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
  `default.md` ships for every usecase, so a request normally cannot fail to find a prompt — an install someone edited breaks that. The
  resolver therefore treats "no layer answered" as a failed request naming the usecase whose prompt is missing, and never runs the model on
  an empty system prompt: a wrong answer produced with no instructions is worse than a stated failure.
- `default.md` serves the most models, and a `<model>.md` exists only where a model needs its own. One is deleted once it stops earning its
  place. Transaction extraction ships none.
- Renaming a catalogue key (ADR-002) orphans any model-specific override for it. Layer 2 or 4 then answers, so behavior stays correct while
  the file silently stops being consulted — which is why the app must report **which layer resolved** a request. The failure mode of an
  override is forgetting one is in place and debugging the wrong prompt.
- **No shipped prompt names a vendor or a company.** Prompts stay abstract so the app's whole audience benefits from them; power users are
  invited to tune their own under the rules above.

## ADR-011: For PDF import, the model emits one grammar-constrained JSON object, and it writes nothing

**Status:** accepted

**Decision.** The model gets exactly one job per invocation: produce JSON matching a grammar (GBNF / JSON-schema constrained decoding), for
one document, in one context discarded afterwards. **No endpoint is reachable from it**. Resolution, validation and persistence happen
afterwards in deterministic code, and the result is a draft a human confirms before anything is written.

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
therefore the unit of the question, and the id list makes that expressible without letting a value be invented.

**The request names the currency its answer is to be denoted in, and the message states it before the page**, so the rule is read before the
text it governs. A dividend printing a foreign amount and its converted counterpart states each figure twice, and taking both is how a total
silently doubles. Which tokens carry that code is settled before the request is built (ADR-009), never during inference.

*Leaving the choice of currency to the model is declined.* The transaction's currency is known before the document is opened — the depot
states it — so asking a 2B–9B model to re-decide it per figure trades a fact for an inference, on exactly the comparison it is least
reliable at.

**This is a marking and no filter.** An unmarked amount stays a token the model may sort: the figures of a page are not separable into
currencies without deciding which column of a conversion is which, and a token sorted wrongly is the price of never dropping one that should
have been kept. A mark also sits on a price per share and on a limit, which are quoted in a currency and are no amounts — the prompt says
so, not the marking.

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
- Where a target type carries one summed field, the model states the lines it attributes to that field and postprocessing adds them up.
  Asking for the sum would ask the model to do arithmetic, where selecting lines asks it only to read. The lines are safe to collect only
  because of the currency rule above; without it, the foreign-currency duplicate of a tax line enters the total.

## ADR-012: A changed system prompt releases as a patch, the first prompt for a usecase as a minor

**Status:** accepted

**Context.** ADR-010 makes prompts packaged files versioned with the release, and calls them the artifact this domain iterates on most. A
release whose entire content is a reworded instruction is therefore plausible, and `CHANGELOG.md` commits the project to semver.
`architecture/api.md`'s ADR-013 fixed how one shipped artifact maps onto that; prompts need the same statement, or every tuning round is
arguable in both directions.

**Decision.** The release class follows what a prompt change does to the app's surface:

- **Editing a packaged prompt is a patch.** Rewording, restructuring, adding or dropping an instruction, replacing an example — whatever it
  does to the quality of the answers. Adding a `prompts/<usecase>/<model>.md` where layer 4's `default.md` already answered is the same
  case, and so is deleting one once it stops earning its place (ADR-010): the usecase already answered on that model, and what moved is how
  well.
- **Shipping the first packaged prompt for a usecase is a minor.** Layer 4 makes ADR-010's resolution total, so a usecase with no packaged
  `default.md` fails every request naming its missing prompt. The file that turns "this feature reports it has no prompt" into "this feature
  answers" adds functionality. A new usecase also needs UI and an IPC channel around it, so a new `default.md` by itself changes nothing
  about how users engage with AI here.

**Why an improved prompt is no minor.** After a reworded system prompt the app offers the same screens, IPC channels, catalogue keys and
JSON shape — ADR-011 pins that shape to a grammar, so even the extraction's output type is unmoved. Counting the change as a minor would
make the minor version a count of tuning rounds.

**Nothing in a prompt can force a major.** Model output is not a compatibility surface: the grammar bounds what may come out, and the values
inside it were never promised to be stable across versions. A prompt also sits behind the bridge, so no third party can address it.

**Alternatives declined.**

- *Every added packaged prompt file is a minor, whichever layer it sits in.* Mechanical and cheap to apply, and wrong on the case it
  decides: a `<model>.md` written because the shared default underperforms on one model is an improvement to a shipped usecase, and shipping
  the identical improvement by editing `default.md` would then be a patch. The version would depend on which file the fix landed in.

**Consequences.**

- A prompt-only release appears under `Changed` in `CHANGELOG.md`, even though only the version's third component moves.
- **The minor half of this rule rarely fires by itself.** A new usecase's `default.md` ships with the code that calls it, and that code is
  already a minor.
- **On-disk overrides are outside this entirely.** Layers 1 and 2 are user files, carry no version, and keep winning after a patch rewrote
  the packaged file underneath them. That is ADR-010's "debugging the wrong prompt" failure mode with a version number attached, and it is
  why a report against a patch has to name which layer resolved the request.
- A prompt edit that only works together with a code change — a field the grammar has to allow (ADR-011), a value an extraction stage has to
  produce first (ADR-009) — is classified by that code, being part of a larger change and not the change itself.

## ADR-013: A page's notation is read exactly once, in the tier that parsed the page

**Status:** accepted

**Context.** ADR-008 puts the parse in the UI and ADR-011 builds the grammar out of the document's own tokens. The bridge between the two
carries **text**, which leaves one question open: a printed `1.005,00` can be read into a number by the tier that parsed the page or again
by the tier that generates the grammar, and both are able to. Unless the question is settled it gets answered twice — two implementations of
one domain, each ahead of the other on whichever notations its author met, and nothing checking that they agree.

A disagreement is asymmetric, and both halves are bad. A value the **parsing** tier cannot read loses its label and reaches the model as
bare text in a row. A value the **grammar** tier cannot read gets no slot at all, and a value with no slot is one the answer cannot carry.

**Decision.** The UI states what the document states: every value, and the security the page names. It walks the tokens stage 5 of ADR-009
produced and reports each as an id, a kind, the text as printed, the value in the notation an answer uses, the label naming it and the
requested currency where the page denotes it in that. The extraction request carries that **as typed JSON beside the rendered text**, so the
tier building a grammar out of it parses nothing. **No notation is read in the main process at all.**

Each reader of a notation has two levels over one implementation: one enumerates every reading the notation admits, the likelier one first,
and one takes that likelier reading, which is what a token carries. Where a notation is genuinely ambiguous the code commits and the model
is never asked, since which reading a page means is a property of the page and no judgement about the transaction.

**Alternatives declined.**

- *A reader in each tier, tested against one shared fixture list.* The cheapest option, and it leaves every future notation a two-file edit
  in two languages, enforced by a test someone has to remember instead of by there being one place to edit.
- *Sharing the modules across the tiers.* Compiling the UI's readers into a form the main process can require is possible, and it costs a
  build step before a suite that otherwise needs nothing but an install, an entry in the packaging allowlist, and build-order coupling
  between the two tiers. It also keeps the re-derivation and only makes two copies agree, where having one makes the question go away.

**Consequences.**

- **No masking pass is needed.** Masking is what a regex scanning flat text needs so the digits of a date are not read a second time as a
  number of their own; a token model knows what each word is.
- **The page guarantee is the one ADR-011 asks for.** The slots are over the tokens stage 5 produced, which is the document model and no
  rendering of it, so every slot is a value the page states. A scanner over flat text would offer substrings of words that state no value.
- **The tokens cross the bridge and are therefore untrusted input**, bounded by the IPC schema like everything else: how many a document may
  state and how long each field may be, both about what llama.cpp is asked to compile. No authority is handed over — the text those tokens
  were read from comes from the UI too.
- **A reading is taken off one document in one call**, so text, tokens and security describing two different documents is not something a
  caller can assemble by accident.
- **The security follows the same rule.** An ISIN is something the page states, so it is read in the UI — which is also its only consumer,
  resolving it against the securities it holds. It is no part of the answer: the grammar has no rule for it and the answer schema refuses
  the key.
- **Coverage is one gap in one place.** A notation this tier cannot read is a value no field of the answer can carry, and that is answerable
  without loading a model: whether the generated grammar can state a given value is a property of the tokens alone.
