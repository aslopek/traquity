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

const aiDownloadKeySchema = z.string().min(1).max(MAXIMUM_AI_KEY_LENGTH);

module.exports = {
  backendStartPasswordSchema,
  authVerifyPasswordSchema,
  databasePathSchema,
  databaseSelectionSchema,
  configurationChangesSchema,
  javaSettingSchema,
  aiDownloadKeySchema,
  MAXIMUM_PASSWORD_LENGTH,
  MAXIMUM_PATH_LENGTH
};
