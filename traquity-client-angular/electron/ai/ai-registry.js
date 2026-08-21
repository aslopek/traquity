const crypto = require('node:crypto');
const {modelEntrySchema} = require('../config/config-schema.js');
const {digestOfFile} = require('../security/file-digest.js');
const {CATALOGUE, catalogueEntries} = require('./catalogue.js');

/** @import {AiConfig, ModelEntry, TraQuityConfig} from '../config/config-schema.js' */
/** @import {ConfigFile} from '../config/config-file.js' */
/** @import {CatalogueEntry, CatalogueRecord} from './catalogue.js' */

/**
 * The `ai` key of a loaded config: the notice confirmation and which catalogued models are actually installed. Never
 * a passthrough of `config.ai` - a model's `path` is re-verified against the filesystem and the catalogue's own
 * pinned digest on every read, and the confirmation is re-verified against the packaged notice resource's own bytes.
 */

/**
 * @typedef {Object} AiState
 * @property {boolean} isConfirmed
 * @property {CatalogueEntry[]} catalogue
 * @property {Record<string, ModelEntry>} models keyed by catalogue key; a key absent from this map is not installed
 */

/**
 * The three functions this module needs off `fs` - declared minimally
 *
 * @typedef {Object} AiRegistryFileSystem
 * @property {(path: string) => boolean} existsSync
 * @property {(path: string) => Buffer} readFileSync
 * @property {(path: string) => NodeJS.ReadableStream} createReadStream
 */

/**
 * @typedef {Object} AiRegistry
 * @property {() => Promise<AiState>} getState
 * @property {() => void} confirm takes no argument; hashes the packaged notice resource itself and persists that
 *   digest as the confirmation
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
   * @param {CatalogueRecord} entry
   * @param {unknown} rawEntry
   * @returns {Promise<ModelEntry | null>}
   */
  async function installedEntry(entry, rawEntry) {
    const parsedEntry = modelEntrySchema.safeParse(rawEntry);
    if (!parsedEntry.success || !fileSystem.existsSync(parsedEntry.data.path)) {
      return null;
    }
    /** @type {string} */
    const digest = await digestOfFile(parsedEntry.data.path, 'sha256', fileSystem.createReadStream);
    return digest === entry.sha256 ? parsedEntry.data : null;
  }

  /**
   * @returns {Promise<AiState>}
   */
  async function getState() {
    /** @type {boolean} */
    const isConfirmed = config.ai?.confirmedNotice != null && config.ai.confirmedNotice === digestOfNotice();

    /** @type {Record<string, ModelEntry>} */
    const models = {};
    /** @type {ModelEntry | null} */
    let installed;
    for (const entry of Object.values(CATALOGUE)) {
      installed = await installedEntry(entry, config.ai?.models?.[entry.key]);
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

  return {getState, confirm};
}

module.exports = {createAiRegistry};
