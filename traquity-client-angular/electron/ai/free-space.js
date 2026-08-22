/**
 * Whether a directory's disk has at least a required number of free bytes. Used before a model download starts,
 * where "required" is the catalogue's exact `sizeBytes` plus a margin the caller decides - the staging file and the
 * final file briefly coexist during the rename, and the download must never be the thing that fills the disk.
 */

/** @type {number} */
const GIBIBYTE = 1024 * 1024 * 1024;

/**
 * The one `fs` function this module needs, narrowed to what it reads off the result.
 *
 * @typedef {Object} FreeSpaceFileSystem
 * @property {(path: string) => {bavail: number, bsize: number}} statfsSync
 */

/**
 * @param {string} directory
 * @param {number} requiredBytes
 * @param {FreeSpaceFileSystem} fileSystem
 * @returns {boolean}
 */
function hasEnoughFreeSpace(directory, requiredBytes, fileSystem) {
  const {bavail, bsize} = fileSystem.statfsSync(directory);
  return bavail * bsize >= requiredBytes;
}

module.exports = {hasEnoughFreeSpace, GIBIBYTE};
