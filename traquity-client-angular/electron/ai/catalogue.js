/**
 * The curated models. Each pinned to a Hugging Face revision and never to `main`. This module owns the full internal shape:
 * `repo`/`revision`/`file`/`sha256` exist only to build a download request from this module's own copy of the catalogue, never from
 * anything handed from outside.
 */

/**
 * @typedef {Object} CatalogueRecord
 * @property {string} key
 * @property {string} description human-readable label, e.g. "Qwen 3.5 4B Q4"
 * @property {number} sizeBytes
 * @property {string} license
 * @property {string} repo the Hugging Face repo, e.g. "bartowski/Qwen_Qwen3.5-4B-GGUF"
 * @property {string} revision the pinned commit this app downloads from
 * @property {string} file the file name within `repo`@`revision`
 * @property {string} sha256 the pinned digest of `file`, as lowercase hex - the LFS OID Hugging Face reports for it
 */

/**
 * @typedef {Object} CatalogueEntry
 * @property {string} key
 * @property {string} description
 * @property {number} sizeBytes
 * @property {string} license
 */

/** @satisfies {Record<string, CatalogueRecord>} */
const CATALOGUE = {
  'qwen-2b': {
    key: 'qwen-2b',
    description: 'Qwen 3.5 2B Q4 K_M',
    sizeBytes: 1280835840,
    license: 'Apache-2.0',
    repo: 'unsloth/Qwen3.5-2B-GGUF',
    revision: 'f6d5376be1edb4d416d56da11e5397a961aca8ae',
    file: 'Qwen3.5-2B-Q4_K_M.gguf',
    sha256: 'aaf42c8b7c3cab2bf3d69c355048d4a0ee9973d48f16c731c0520ee914699223'
  },
  'qwen-4b': {
    key: 'qwen-4b',
    description: 'Qwen 3.5 4B Q4 K_M',
    sizeBytes: 3013027808,
    license: 'Apache-2.0',
    repo: 'bartowski/Qwen_Qwen3.5-4B-GGUF',
    revision: '4168f45a16a1290d65a4ec0fa312ae917a4c15d6',
    file: 'Qwen_Qwen3.5-4B-Q4_K_M.gguf',
    sha256: '13c16f426047e2de38cd075bdade4a7bcbc8c774384876f677740cda65f8a983'
  },
  'qwen-9b': {
    key: 'qwen-9b',
    description: 'Qwen 3.5 9B Q4 K_M',
    sizeBytes: 6169341984,
    license: 'Apache-2.0',
    repo: 'bartowski/Qwen_Qwen3.5-9B-GGUF',
    revision: '182be2fd6c7bc44887d88a91cb03ff009cc9f549',
    file: 'Qwen_Qwen3.5-9B-Q4_K_M.gguf',
    sha256: 'd784ce9eda1a5a7b51e8f705a9e6310844bf4f173654d115823c775fdea56d43'
  }
};

/**
 * Projects `CATALOGUE` down to `CatalogueEntry`: `repo`/`revision`/`file`/`sha256` stripped.
 *
 * @returns {CatalogueEntry[]}
 */
function catalogueEntries() {
  return Object.values(CATALOGUE).map(({key, description, sizeBytes, license}) => ({key, description, sizeBytes, license}));
}

module.exports = {CATALOGUE, catalogueEntries};
