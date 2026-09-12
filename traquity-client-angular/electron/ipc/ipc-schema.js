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
 * How many values of one kind a document may state, and how long one of them may be. A literal becomes a rule of a
 * generated grammar, so the bound is about what llama.cpp is asked to compile: the count caps the alternation and
 * the length caps one branch of it. Both sit far above what a settlement prints and far below a grammar that takes
 * longer to compile than the generation it constrains.
 */
const MAXIMUM_AI_LITERALS = 2 ** 12;
const MAXIMUM_AI_LITERAL_LENGTH = 64;

const aiLiteralsSchema = z.array(z.string().min(1).max(MAXIMUM_AI_LITERAL_LENGTH)).max(MAXIMUM_AI_LITERALS);

/**
 * The values a document states, read in the renderer that parsed the page (see `../LLM.md`) and stated in the
 * notation an answer uses.
 */
const aiDocumentLiteralsSchema = z.strictObject({
  dates: aiLiteralsSchema,
  times: aiLiteralsSchema,
  numbers: aiLiteralsSchema
});

/** @typedef {z.infer<typeof aiDocumentLiteralsSchema>} DocumentLiterals */

const aiExtractionRequestSchema = z.strictObject({
  document: z.string().min(1).max(MAXIMUM_AI_DOCUMENT_LENGTH),
  literals: aiDocumentLiteralsSchema,
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
  aiDocumentLiteralsSchema,
  MAXIMUM_PASSWORD_LENGTH,
  MAXIMUM_PATH_LENGTH,
  MAXIMUM_AI_DOCUMENT_LENGTH,
  MAXIMUM_AI_LITERALS,
  MAXIMUM_AI_LITERAL_LENGTH
};
