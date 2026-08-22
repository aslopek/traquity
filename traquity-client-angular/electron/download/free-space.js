/**
 * Whether a directory's disk has at least a required number of free bytes.
 */

/**
 * The one `fs` function this module needs.
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

module.exports = {hasEnoughFreeSpace};
