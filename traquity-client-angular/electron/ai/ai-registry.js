const crypto = require('node:crypto');
const {modelEntrySchema} = require('../config/config-schema.js');
const {digestOfFile} = require('../security/file-digest.js');
const {messageOf} = require('../download/error-message.js');
const {CATALOGUE, catalogueEntries} = require('./catalogue.js');

/** @import {AiConfig, ModelEntry, TraQuityConfig} from '../config/config-schema.js' */
/** @import {ConfigFile} from '../config/config-file.js' */
/** @import {CatalogueEntry, CatalogueRecord} from './catalogue.js' */

/**
 * The `ai` key of a loaded config: the notice confirmation and which catalogued models are actually installed. Never
 * a passthrough of `config.ai` - a model's `path` is re-verified against the filesystem on every read, and the
 * confirmation is re-verified against the packaged notice resource's own bytes.
 *
 * This module hashes a model's own bytes at one point only, `remove`, in order to prevent a faulty config leading to the wrong file being
 * deleted. Validating the GGUF file hashes on reading significantly slows down the application, which is why it's omitted.
 */

/**
 * @typedef {Object} AiState
 * @property {boolean} isConfirmed
 * @property {CatalogueEntry[]} catalogue
 * @property {Record<string, ModelEntry>} models keyed by catalogue key; a key absent from this map is not installed
 */

/**
 * What `remove` answers with. There is no cancellation.
 *
 * @typedef {{status: 'removed'} | {status: 'failed', message: string}} AiRemoveOutcome
 */

/**
 * What `activate` answers with. There is no cancellation.
 *
 * @typedef {{status: 'activated'} | {status: 'failed', message: string}} AiActivateOutcome
 */

/**
 * The functions this module needs off `fs` - declared minimally
 *
 * @typedef {Object} AiRegistryFileSystem
 * @property {(path: string) => boolean} existsSync
 * @property {(path: string) => Buffer} readFileSync
 * @property {(path: string) => NodeJS.ReadableStream} createReadStream
 * @property {(path: string, options: {force: boolean}) => void} rmSync
 */

/**
 * @typedef {Object} AiRegistry
 * @property {() => AiState} getState
 * @property {() => void} confirm takes no argument; hashes the packaged notice resource itself and persists that
 *   digest as the confirmation
 * @property {(key: string, modelPath: string) => void} install persists a completed download's path for `key`,
 *   replacing whatever was there; preserves the entry's existing `active` flag
 * @property {(key: string) => Promise<AiRemoveOutcome>} remove deletes the file backing an installed AI model from
 *   the catalogue, once its bytes hash to the digest that catalogue pins
 * @property {(key: string) => AiActivateOutcome} activate marks `key`'s installed entry active and clears the flag on every other one
 */

/**
 * @typedef {Object} AiRegistryOptions
 * @property {Pick<ConfigFile, 'save'>} configFile
 * @property {TraQuityConfig} config
 * @property {string} noticePath the packaged `ai-notice.component.html` resource this app displayed
 * @property {AiRegistryFileSystem} fileSystem
 */

/**
 * @param {AiRegistryOptions} options
 * @returns {AiRegistry}
 */
function createAiRegistry(options) {
  const {configFile, config, noticePath, fileSystem} = options;

  /**
   * @returns {string} the base64 sha256 digest of the packaged notice resource's own bytes
   */
  function digestOfNotice() {
    return crypto.createHash('sha256').update(fileSystem.readFileSync(noticePath)).digest('base64');
  }

  /**
   * @param {unknown} rawEntry
   * @returns {ModelEntry | null} the parsed entry, if and only if it validates against the schema and its file
   *   exists on disk - what the bytes at that path are is not checked here
   */
  function parsedInstalledEntry(rawEntry) {
    const parsedEntry = modelEntrySchema.safeParse(rawEntry);
    return parsedEntry.success && fileSystem.existsSync(parsedEntry.data.path) ? parsedEntry.data : null;
  }

  /**
   * @returns {AiState}
   */
  function getState() {
    /** @type {boolean} */
    const isConfirmed = config.ai?.confirmedNotice != null && config.ai.confirmedNotice === digestOfNotice();

    /** @type {Record<string, ModelEntry>} */
    const models = {};
    for (const entry of Object.values(CATALOGUE)) {
      /** @type {ModelEntry | null} */
      const installed = parsedInstalledEntry(config.ai?.models?.[entry.key]);
      if (installed != null) {
        models[entry.key] = installed;
      }
    }

    return {isConfirmed, catalogue: catalogueEntries(), models};
  }

  /**
   * @returns {void}
   */
  function confirm() {
    config.ai = {
      confirmedNotice: digestOfNotice(),
      models: config.ai?.models ?? {}
    };
    configFile.save(config);
  }

  /**
   * @param {unknown} rawEntry
   * @returns {boolean}
   */
  function wasActive(rawEntry) {
    const parsedEntry = modelEntrySchema.safeParse(rawEntry);
    return parsedEntry.success && parsedEntry.data.active;
  }

  /**
   * @param {string} key
   * @param {string} modelPath
   * @returns {void}
   */
  function install(key, modelPath) {
    /** @type {unknown} */
    const previousEntry = config.ai?.models?.[key];
    /** @type {Record<string, unknown>} */
    const models = {
      ...(config.ai?.models ?? {}),
      [key]: {
        path: modelPath,
        active: wasActive(previousEntry)
      }
    };

    /** @type {AiConfig} */
    const nextAiConfig = {models};
    if (config.ai?.confirmedNotice != null) {
      nextAiConfig.confirmedNotice = config.ai.confirmedNotice;
    }

    config.ai = nextAiConfig;
    configFile.save(config);
  }

  /**
   * @param {string} key
   * @returns {Promise<AiRemoveOutcome>}
   */
  async function remove(key) {
    const catalogueEntry = /** @type {Record<string, CatalogueRecord>} */ (CATALOGUE)[key];
    const installed = catalogueEntry == null ? null : parsedInstalledEntry(config.ai?.models?.[key]);
    if (catalogueEntry == null || installed == null) {
      return {status: 'failed', message: `No installed model for ${key}`};
    }

    /** @type {string} */
    const digest = await digestOfFile(installed.path, 'sha256', fileSystem.createReadStream);
    if (digest !== catalogueEntry.sha256) {
      return {status: 'failed', message: `Installed model for ${key} failed digest verification`};
    }

    try {
      fileSystem.rmSync(installed.path, {force: true});
    } catch (error) {
      return {status: 'failed', message: messageOf(error)};
    }

    const {[key]: _removedEntry, ...models} = config.ai?.models ?? {};

    /** @type {AiConfig} */
    const nextAiConfig = {models};
    if (config.ai?.confirmedNotice != null) {
      nextAiConfig.confirmedNotice = config.ai.confirmedNotice;
    }

    config.ai = nextAiConfig;
    configFile.save(config);

    return {status: 'removed'};
  }

  /**
   * @param {string} key
   * @returns {AiActivateOutcome}
   */
  function activate(key) {
    /** @type {Record<string, unknown>} */
    const rawModels = config.ai?.models ?? {};
    /** @type {CatalogueRecord | undefined} */
    const catalogueEntry = /** @type {Record<string, CatalogueRecord>} */ (CATALOGUE)[key];
    /** @type {import('zod').ZodSafeParseResult<ModelEntry>} */
    const parsedTarget = modelEntrySchema.safeParse(rawModels[key]);
    if (catalogueEntry == null || !parsedTarget.success) {
      return {status: 'failed', message: `No installed model for ${key}`};
    }

    /** @type {Record<string, unknown>} */
    const models = {};
    for (const [modelKey, rawEntry] of Object.entries(rawModels)) {
      if (modelKey === key) {
        models[modelKey] = {...parsedTarget.data, active: true};
        continue;
      }
      /** @type {import('zod').ZodSafeParseResult<ModelEntry>} */
      const parsedEntry = modelEntrySchema.safeParse(rawEntry);
      models[modelKey] = parsedEntry.success ? {...parsedEntry.data, active: false} : rawEntry;
    }

    /** @type {AiConfig} */
    const nextAiConfig = {models};
    if (config.ai?.confirmedNotice != null) {
      nextAiConfig.confirmedNotice = config.ai.confirmedNotice;
    }

    config.ai = nextAiConfig;
    configFile.save(config);

    return {status: 'activated'};
  }

  return {getState, confirm, install, remove, activate};
}

module.exports = {createAiRegistry};
