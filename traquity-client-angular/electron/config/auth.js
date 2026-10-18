const {randomBytes, scryptSync, timingSafeEqual} = require('node:crypto');
const {authEntrySchema} = require('./config-schema.js');

/** @import {AuthEntry, ScryptRecord} from './config-schema.js' */

/**
 * Pure operations over a single `auth` entry of `traquity.config.json`: create a record, classify one, verify a
 * candidate password against one. No file system, no config object, no logging - and above all no plaintext password
 * leaving this module in any shape: it is never persisted, never logged and never embedded in an error.
 */

/** @typedef {'pending' | 'passwordless' | 'scrypt'} AuthState */

/** @typedef {Pick<ScryptRecord, 'cost' | 'blockSize' | 'parallelization'>} ScryptParameters */

/**
 * Persisted per record, so they can be raised later without invalidating entries written by an older version.
 *
 * @satisfies {ScryptParameters}
 */
const SCRYPT_PARAMETERS = {
  cost: 16384,
  blockSize: 8,
  parallelization: 1
};

const SALT_BYTES = 16;
const HASH_BYTES = 32;

// Resource bounds for the parameters read back from the hand-editable config file. They sit here rather than in the
// schema because they protect the `scryptSync` call below: a huge key length or huge parameters would turn a mangled
// config entry into a memory/CPU bomb in the main process. An entry violating them reads as pending, which is
// self-healing - the next proven start rewrites it.
const MINIMUM_HASH_BYTES = 16;
const MAXIMUM_HASH_BYTES = 64;
const MAXIMUM_SCRYPT_MEMORY_BYTES = 256 * 1024 * 1024;
const SCRYPT_MEMORY_HEADROOM_BYTES = 32 * 1024 * 1024;
// `parallelization` hardly moves the memory requirement but multiplies the CPU work one to one, so it needs a bound
// of its own on top of it.
const MAXIMUM_PARALLELIZATION = 16;

/**
 * @param {string} password
 * @returns {AuthEntry}
 */
function createScryptRecord(password) {
  /** @type {Buffer<ArrayBuffer>} */
  const salt = randomBytes(SALT_BYTES);

  /** @type {Buffer} */
  const hash = hashPassword(password, salt, HASH_BYTES, SCRYPT_PARAMETERS);
  return {
    scrypt: {
      salt: salt.toString('base64'),
      hash: hash.toString('base64'),
      ...SCRYPT_PARAMETERS
    }
  };
}

/**
 * @returns {AuthEntry}
 */
function passwordlessEntry() {
  return {passwordless: true};
}

/**
 * Classifies an entry read from the config file. Anything that is not a well-formed, resource-bounded record -
 * a missing entry, an empty object, a mangled scrypt block - reads as pending, and nothing here ever throws.
 *
 * @param {unknown} entry
 * @returns {AuthState}
 */
function authStateOf(entry) {
  const parsedEntry = parseEntry(entry);
  if (parsedEntry === null) {
    return 'pending';
  }
  if ('passwordless' in parsedEntry) {
    return 'passwordless';
  }
  return isWithinResourceBounds(parsedEntry.scrypt) ? 'scrypt' : 'pending';
}

/**
 * Verifies a candidate against an entry, locally and synchronously. A pending entry has nothing to verify against and
 * yields `false` too, so a `false` means 'not proven' rather than 'wrong password' - only `authStateOf` tells the two
 * apart.
 *
 * @param {unknown} entry
 * @param {string} candidate
 * @returns {boolean}
 */
function verifyPassword(entry, candidate) {
  const parsedEntry = parseEntry(entry);
  if (parsedEntry === null) {
    return false;
  }
  if ('passwordless' in parsedEntry) {
    return candidate === '';
  }
  return matchesScryptRecord(parsedEntry.scrypt, candidate);
}

/**
 * @param {unknown} entry
 * @returns {AuthEntry | null}
 */
function parseEntry(entry) {
  const parsedEntry = authEntrySchema.safeParse(entry);
  return parsedEntry.success ? parsedEntry.data : null;
}

/**
 * Hashes with the record's *stored* parameters rather than the current defaults - which is the whole reason they are
 * persisted per entry.
 *
 * @param {ScryptRecord} record
 * @param {string} candidate
 * @returns {boolean}
 */
function matchesScryptRecord(record, candidate) {
  if (!isWithinResourceBounds(record)) {
    return false;
  }
  const expectedHash = Buffer.from(record.hash, 'base64');
  const candidateHash = hashPasswordOrNull(candidate, Buffer.from(record.salt, 'base64'), expectedHash.length, record);
  if (candidateHash === null || candidateHash.length !== expectedHash.length) {
    return false;
  }
  return timingSafeEqual(candidateHash, expectedHash);
}

/**
 * The bounds above are meant to make a rejected hashing unreachable. This exists because they mirror a rule
 * enforced inside a bundled crypto library, and the specs only ever observe Node's copy of it while the shipped app
 * runs Electron's (see `../LLM.md`): should the two ever disagree, a record must read as 'does not verify' rather
 * than throw out of the startup path. The failure is swallowed rather than logged - nothing here may surface a
 * candidate password, not even inside an error.
 *
 * @param {string} password
 * @param {Buffer} salt
 * @param {number} hashBytes
 * @param {ScryptParameters} parameters
 * @returns {Buffer | null}
 */
function hashPasswordOrNull(password, salt, hashBytes, parameters) {
  try {
    return hashPassword(password, salt, hashBytes, parameters);
  } catch {
    return null;
  }
}

/**
 * scrypt is a key derivation function, but the bytes it returns are never used as a key here - they are stored and
 * compared as a password hash, and nothing in this app encrypts with them. Hence the name: `keylen` below is scrypt's
 * own parameter, and this is the only place that vocabulary applies.
 *
 * @param {string} password
 * @param {Buffer} salt
 * @param {number} hashBytes
 * @param {ScryptParameters} parameters
 * @returns {Buffer}
 */
function hashPassword(password, salt, hashBytes, parameters) {
  return scryptSync(password, salt, hashBytes, {
    ...parameters,
    // Node's 32 MiB default would throw the moment the parameters above are raised, so it is passed explicitly
    maxmem: memoryRequirementOf(parameters) + SCRYPT_MEMORY_HEADROOM_BYTES
  });
}

/**
 * @param {ScryptRecord} record
 * @returns {boolean}
 */
function isWithinResourceBounds(record) {
  const hashBytes = Buffer.from(record.hash, 'base64').length;
  return hashBytes >= MINIMUM_HASH_BYTES
    && hashBytes <= MAXIMUM_HASH_BYTES
    && memoryRequirementOf(record) <= MAXIMUM_SCRYPT_MEMORY_BYTES
    && record.parallelization <= MAXIMUM_PARALLELIZATION
    && isRunnableCost(record.cost, record.blockSize);
}

/**
 * The memory scrypt allocates for these parameters: `128 * blockSize * (cost + parallelization + 2)`, the formula
 * both scrypt implementations behind `scryptSync` apply when validating `maxmem` - OpenSSL, which Node bundles and
 * the specs therefore run against, and BoringSSL, which Electron bundles and the shipped app therefore runs against.
 * Bound and `maxmem` are derived from the very same expression on purpose - that is what makes 'within bounds' mean
 * '`scryptSync` will run this' rather than an estimate a hand-edited record can slip past into an exception.
 *
 * @param {ScryptParameters} parameters
 * @returns {number}
 */
function memoryRequirementOf(parameters) {
  return 128 * parameters.blockSize * (parameters.cost + parameters.parallelization + 2);
}

/**
 * scrypt rejects a cost that is not a power of two greater than one, and one that is not below `2 ** (16 * blockSize)`
 * - a hand-edited pair violating either makes `scryptSync` throw, so neither may get past the classification.
 *
 * @param {number} cost
 * @param {number} blockSize
 * @returns {boolean}
 */
function isRunnableCost(cost, blockSize) {
  if (cost <= 1 || !Number.isInteger(Math.log2(cost))) {
    return false;
  }
  return 16 * blockSize > 64 || cost < 2 ** (16 * blockSize);
}

module.exports = {
  createScryptRecord,
  passwordlessEntry,
  authStateOf,
  verifyPassword
};
