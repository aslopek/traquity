const {z} = require('zod');
const {MAXIMUM_SIGNATURE_LENGTH} = require('../security/signature-bounds.js');

/**
 * The schemas for `traquity.config.json`, which is user-editable input from outside the program. This module is the
 * single definition of every shape read from that file: zod validates at runtime and the static types are inferred
 * from the very same schemas, so a parsed shape can never drift from the code that describes it.
 *
 * The semantic checks do not live here - zod answers "is this shaped like a scrypt record", while the resource bounds
 * that keep `scryptSync` from becoming a memory or CPU bomb belong next to the call they protect (see `auth.js`).
 */

const scryptRecordSchema = z.strictObject({
  salt: z.base64(),
  hash: z.base64(),
  cost: z.int().positive(),
  blockSize: z.int().positive(),
  parallelization: z.int().positive()
});

// strict on both variants is what makes the union decide by key rather than by heuristic: an entry carrying both keys
// matches neither, instead of silently reading as a scrypt record
const authEntrySchema = z.union([
  z.strictObject({scrypt: scryptRecordSchema}),
  z.strictObject({passwordless: z.literal(true)})
]);

// tolerant like `auth`: a hand-edited `java` block that does not parse must not make the whole config unreadable over
// one unrelated key. `signature` is the base64 of a downloaded archive's detached signature - present only for a
// runtime this app downloaded itself, `null`/absent for a picked or automatically-resolved one.
const javaSchema = z.looseObject({
  path: z.string().nullable().catch(null),
  signature: z.base64().max(MAXIMUM_SIGNATURE_LENGTH).nullable().catch(null).optional()
}).catch({path: null}).optional();

// `{path, active}`, always both fields together - the same shape in the persisted config's
// `ai.models[key]` and in `ai:getState`'s response. Kept out of `aiSchema.models` itself (validated there as a
// record of `unknown`) so `ai/ai-registry.js` can classify one entry at a time. This ensures one broken record
// does not break the entire config.
const modelEntrySchema = z.strictObject({
  path: z.string(),
  active: z.boolean()
});

// tolerant: a mangled `ai` block, a mangled `confirmedNotice`, or a mangled model entry must
// each make only the smallest possible thing read as its default - unconfirmed, not installed - rather than break
// the whole config. `confirmedNotice` catching to `undefined` is what makes a hand-edited digest read as
// unconfirmed instead of a schema failure, and `models` stays a record of `unknown` for the same reason `auth` does.
const aiSchema = z.looseObject({
  confirmedNotice: z.base64().optional().catch(undefined),
  models: z.record(z.string(), z.unknown()).optional()
}).catch({}).optional();

const traquityConfigSchema = z.looseObject({
  // `catchall` keeps arbitrary user-added environment entries valid while TQ_DB_FILE_PATH stays a declared key, which
  // is what makes `config.env.TQ_DB_FILE_PATH` legal under `noPropertyAccessFromIndexSignature`
  env: z.object({TQ_DB_FILE_PATH: z.string().optional()}).catchall(z.string()),
  // deliberately not validated per `authEntrySchema` here: a single mangled entry must make *that* database pending
  // (`authStateOf` classifies it) rather than throwing away the whole config file
  auth: z.record(z.string(), z.unknown()).default({}),
  // one-shot: read at start to force `configure` mode and deleted in the same step, so it cannot outlive the run it was written for
  configureOnNextStart: z.boolean().optional(),
  java: javaSchema,
  ai: aiSchema
});

/** @typedef {import('zod').infer<typeof scryptRecordSchema>} ScryptRecord */
/** @typedef {import('zod').infer<typeof authEntrySchema>} AuthEntry */
/** @typedef {import('zod').infer<typeof javaSchema>} JavaConfig */
/** @typedef {import('zod').infer<typeof modelEntrySchema>} ModelEntry */
/** @typedef {import('zod').infer<typeof aiSchema>} AiConfig */
/** @typedef {import('zod').infer<typeof traquityConfigSchema>} TraQuityConfig */

module.exports = {
  scryptRecordSchema,
  authEntrySchema,
  javaSchema,
  modelEntrySchema,
  aiSchema,
  traquityConfigSchema
};
