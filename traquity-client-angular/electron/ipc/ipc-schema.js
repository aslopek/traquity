const {z} = require('zod');
const {MAXIMUM_SIGNATURE_LENGTH} = require('../security/signature-bounds.js');

/**
 * The renderer is outside the main process, so any argument arriving over IPC falls under the zod boundary rule
 * (see `../LLM.md`), exactly like disk or network input. This module is the home for that input's schemas.
 */

/**
 * Upper bounds on every string crossing this boundary. They are not about what a user would plausibly type - they are
 * about what the receiving side does with the value: a password is run through scrypt, a path is spawned or written
 * to the config file, and a renderer displaying data from a database or an HTTP response is not the trustworthy
 * source it looks like. Each bound is far above any real value and far below anything that turns one call into work
 * the main process cannot finish. A signature's own bound is a property of the artifact rather than of this boundary,
 * so it is declared with it, in `security/signature-bounds.js`.
 */
const MAXIMUM_PASSWORD_LENGTH = 1024;
const MAXIMUM_PATH_LENGTH = 4096;

const backendStartPasswordSchema = z.string().max(MAXIMUM_PASSWORD_LENGTH).optional();
const authVerifyPasswordSchema = z.string().max(MAXIMUM_PASSWORD_LENGTH);

const databasePathSchema = z.string().min(1).max(MAXIMUM_PATH_LENGTH);

const databaseSelectionSchema = databasePathSchema.nullable();

const configurationChangesSchema = z.strictObject({
  databasePath: databasePathSchema,
  javaPath: z.string().max(MAXIMUM_PATH_LENGTH).nullable(),
  javaSignature: z.base64().max(MAXIMUM_SIGNATURE_LENGTH).nullable()
});

const javaSettingSchema = z.string().min(1).max(MAXIMUM_PATH_LENGTH).nullable();

/** @type {number} far above any real catalogue key, far below anything a lookup miss could turn into real work */
const MAXIMUM_AI_KEY_LENGTH = 64;

const aiModelKeySchema = z.string().min(1).max(MAXIMUM_AI_KEY_LENGTH);

/**
 * The longest extracted document an extraction request may carry, measured in UTF-16 code units.
 * @type {number}
 */
const MAXIMUM_AI_DOCUMENT_LENGTH = 2 ** 18;

/**
 * How many values a document may state, and how long each part of one may be.
 *
 * `text` and `value` are one printed figure and a tight bound holds them. A `label` is the prose a page prints in
 * front of a figure, which is a whole row of it: a settlement whose footer names a board of directors before an
 * entry in the commercial register prints such a row at well over a hundred characters, so a bound sized for a
 * figure refuses a document that is entirely ordinary. Each is far above any real value and far below what turns
 * one call into work the main process cannot finish.
 */
const MAXIMUM_AI_TOKENS = 2 ** 10;
const MAXIMUM_AI_TOKEN_LENGTH = 128;
const MAXIMUM_AI_LABEL_LENGTH = 2 ** 9;

/** One value a page states, read in the renderer that parsed it (see `../LLM.md`). */
const aiDocumentTokenSchema = z.strictObject({
  id: z.int().positive().max(MAXIMUM_AI_TOKENS),
  kind: z.enum(['date', 'time', 'number']),
  text: z.string().min(1).max(MAXIMUM_AI_TOKEN_LENGTH),
  value: z.string().min(1).max(MAXIMUM_AI_TOKEN_LENGTH),
  label: z.string().max(MAXIMUM_AI_LABEL_LENGTH).nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional()
});

const aiDocumentTokensSchema = z.array(aiDocumentTokenSchema).max(MAXIMUM_AI_TOKENS);

/** @typedef {z.infer<typeof aiDocumentTokenSchema>} DocumentToken */

const aiExtractionRequestSchema = z.strictObject({
  document: z.string().min(1).max(MAXIMUM_AI_DOCUMENT_LENGTH),
  tokens: aiDocumentTokensSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  modelKey: aiModelKeySchema
});

module.exports = {
  backendStartPasswordSchema,
  authVerifyPasswordSchema,
  databasePathSchema,
  databaseSelectionSchema,
  configurationChangesSchema,
  javaSettingSchema,
  aiModelKeySchema,
  aiExtractionRequestSchema,
  aiDocumentTokenSchema,
  MAXIMUM_PASSWORD_LENGTH,
  MAXIMUM_PATH_LENGTH,
  MAXIMUM_AI_DOCUMENT_LENGTH,
  MAXIMUM_AI_TOKENS,
  MAXIMUM_AI_TOKEN_LENGTH,
  MAXIMUM_AI_LABEL_LENGTH
};
