const crypto = require('node:crypto');
const path = require('node:path');
const {Readable} = require('node:stream');
const {pipeline} = require('node:stream/promises');
const {createByteCapTransform} = require('../download/byte-cap-transform.js');
const {messageOf} = require('../download/error-message.js');
const {createProgressReporter} = require('../download/progress-reporter.js');

/**
 * Downloads and verifies one curated model from Hugging Face into a picked directory. Mirrors
 * `java/corretto-download.js`'s shape - the same staging-then-rename structure, the same download mechanics shared
 * through `download/` - because every bound there applies harder to a 1.3-6.2 GB file (epic ADR-003). There is no
 * signature to check here: nobody signs GGUF weights, so the pinned sha256 already baked into the catalogue is what a
 * completed download is measured against, and a mismatch is a failed download exactly like a rejected signature is
 * for Corretto.
 */

/** @import {CatalogueRecord} from './catalogue.js' */

/** @typedef {{status: 'completed', path: string} | {status: 'failed', message: string}} ModelDownloadResult */

/**
 * @typedef {Object} AiDownloadProgress
 * @property {'downloading' | 'verifying' | 'installing'} phase
 * @property {number} receivedBytes
 * @property {number | null} totalBytes null outside the downloading phase
 * @property {number} bytesPerSecond a rolling average over the last few seconds; 0 outside the downloading phase
 * @property {number | null} secondsRemaining null outside the downloading phase
 */

/**
 * The subset of a `fetch` `Response` this module reads - structurally satisfied by the real one.
 *
 * @typedef {Object} DownloadFetchResponse
 * @property {boolean} ok
 * @property {number} status
 * @property {string} url the redirect-resolved URL the response actually came from
 * @property {ReadableStream<Uint8Array> | null} body
 */

/**
 * @typedef {Object} ModelDownloadFileSystem
 * @property {(path: string, options: {force: boolean}) => void} rmSync
 * @property {(oldPath: string, newPath: string) => void} renameSync
 * @property {(path: string) => import('node:fs').WriteStream} createWriteStream
 */

/**
 * @typedef {Object} DownloadModelOptions
 * @property {CatalogueRecord} entry
 * @property {string} targetDirectory the directory the user picked; the staging file and the final file both land here
 * @property {(url: string) => Promise<DownloadFetchResponse>} fetch
 * @property {ModelDownloadFileSystem} fileSystem
 * @property {() => number} now epoch milliseconds
 * @property {(progress: AiDownloadProgress) => void} onProgress
 * @property {number} [maxDownloadBytes] defaults to the entry's `sizeBytes` plus a 1% margin
 */

/** @type {number} the margin added on top of the catalogue's exact byte count before a download is cut off */
const MAX_DOWNLOAD_MARGIN_RATIO = 0.01;

/** @type {string} appended to the catalogue's own file name while a download is still in flight */
const STAGING_SUFFIX = '.download';

/**
 * The pinned download URL for a catalogue entry - built from this app's own copy of `repo`/`revision`/`file`, never
 * from anything handed in from outside, and never from `main`.
 *
 * @param {CatalogueRecord} entry
 * @returns {string}
 */
function pinnedUrlFor(entry) {
  return `https://huggingface.co/${entry.repo}/resolve/${entry.revision}/${entry.file}`;
}

/**
 * @param {CatalogueRecord} entry
 * @param {string} targetDirectory
 * @returns {{stagingPath: string, finalPath: string}}
 */
function pathsFor(entry, targetDirectory) {
  return {
    stagingPath: path.join(targetDirectory, `${entry.file}${STAGING_SUFFIX}`),
    finalPath: path.join(targetDirectory, entry.file)
  };
}

/**
 * @param {DownloadModelOptions} options
 * @returns {Promise<ModelDownloadResult>}
 */
async function downloadModel(options) {
  const {entry, targetDirectory, fetch, fileSystem, now, onProgress} = options;
  const maxDownloadBytes = options.maxDownloadBytes ?? Math.ceil(entry.sizeBytes * (1 + MAX_DOWNLOAD_MARGIN_RATIO));

  const url = pinnedUrlFor(entry);
  const {stagingPath, finalPath} = pathsFor(entry, targetDirectory);

  try {
    const response = await fetch(url);
    if (!response.ok || response.body == null) {
      return {status: 'failed', message: `Failed to download ${url}: HTTP ${response.status}`};
    }
    if (!response.url.startsWith('https://')) {
      return {status: 'failed', message: `Refusing to follow ${url} to ${response.url}`};
    }

    const reporter = createProgressReporter({now, totalBytes: entry.sizeBytes, onProgress});
    const hash = crypto.createHash('sha256');
    const transform = createByteCapTransform({
      maxBytes: maxDownloadBytes,
      onChunk: chunk => {
        hash.update(chunk);
        reporter.addBytes(chunk.length);
      }
    });
    await pipeline(Readable.fromWeb(/** @type {import('node:stream/web').ReadableStream} */ (response.body)), transform,
      fileSystem.createWriteStream(stagingPath));
    reporter.flush();

    onProgress({phase: 'verifying', receivedBytes: 0, totalBytes: null, bytesPerSecond: 0, secondsRemaining: null});

    if (hash.digest('hex') !== entry.sha256) {
      fileSystem.rmSync(stagingPath, {force: true});
      return {status: 'failed', message: `Hash verification failed for ${url}`};
    }

    onProgress({phase: 'installing', receivedBytes: 0, totalBytes: null, bytesPerSecond: 0, secondsRemaining: null});

    fileSystem.renameSync(stagingPath, finalPath);
    return {status: 'completed', path: finalPath};
  } catch (error) {
    try {
      fileSystem.rmSync(stagingPath, {force: true});
    } catch {
      // deliberately swallowed: the download has already failed for a diagnosed reason, and that is the outcome
    }
    return {status: 'failed', message: messageOf(error)};
  }
}

module.exports = {downloadModel, pinnedUrlFor};
