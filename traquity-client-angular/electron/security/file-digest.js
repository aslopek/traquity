const crypto = require('node:crypto');
const {pipeline} = require('node:stream/promises');

/** @import {Hash} from 'node:crypto' */

/**
 * Digests a file's bytes as a stream rather than reading it whole. An artifact of any size is hashed without ever being held in memory.
 */

/**
 * @param {string} filePath
 * @param {string} algorithm a `node:crypto` hash algorithm, e.g. `sha256`
 * @param {(filePath: string) => NodeJS.ReadableStream} createReadStream
 * @returns {Promise<string>} the digest, as lowercase hex
 */
async function digestOfFile(filePath, algorithm, createReadStream) {
  /** @type {Hash} */
  const hash = crypto.createHash(algorithm);
  await pipeline(createReadStream(filePath), hash);
  return hash.digest('hex');
}

module.exports = {digestOfFile};
