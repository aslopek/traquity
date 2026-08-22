const path = require('node:path');
const {Readable, Writable} = require('node:stream');
const {pipeline} = require('node:stream/promises');
const {createByteCapTransform} = require('../download/byte-cap-transform.js');
const {messageOf} = require('../download/error-message.js');
const {createProgressReporter} = require('../download/progress-reporter.js');

/**
 * Downloads and verifies the Amazon Corretto JDK for the running platform, replacing whatever is at
 * `path.resolve('java')` - the app's own working directory, on all three platforms. Nothing is ever extracted before
 * the downloaded archive's detached signature (see `corretto-signature.js`) has verified against the pinned key
 * (`corretto-public-key.js`): a failed verification is a failed download, and the existing runtime is left untouched.
 *
 * The download stages into a sibling `java-download` directory first, so a second run can replace an existing
 * runtime atomically (a rename, not a merge) and so any failure - a rejected signature, a `tar` failure - leaves the
 * previous runtime exactly as it was. Removing that directory again, archive included, is attempted in every case,
 * and is the one step whose own failure is never the outcome: whatever the download resolved to stands.
 */

/** @typedef {{status: 'completed', javaPath: string, signature: string} | {status: 'failed', message: string}} JavaDownloadResult */

/**
 * @typedef {Object} JavaDownloadProgress
 * @property {'downloading' | 'verifying' | 'extracting'} phase
 * @property {number} receivedBytes
 * @property {number | null} totalBytes null when the phase carries no byte count, or content-length was absent
 * @property {number} bytesPerSecond a rolling average over the last few seconds; 0 outside the downloading phase
 * @property {number | null} secondsRemaining null whenever totalBytes is null
 */

/**
 * The subset of a `fetch` `Response` this module reads - structurally satisfied by the real one.
 *
 * @typedef {Object} DownloadFetchResponse
 * @property {boolean} ok
 * @property {number} status
 * @property {string} url the redirect-resolved URL the response actually came from
 * @property {{get: (name: string) => string | null}} headers
 * @property {ReadableStream<Uint8Array> | null} body
 */

/**
 * One directory entry, narrowed to the one thing this module reads off it.
 *
 * @typedef {Object} DirectoryEntry
 * @property {string} name
 * @property {() => boolean} isDirectory
 */

/**
 * The options every removal here is issued with.
 *
 * @typedef {Object} RemovalOptions
 * @property {boolean} recursive
 * @property {boolean} force
 * @property {number} maxRetries
 * @property {number} retryDelay milliseconds before the next attempt, lengthened by that same amount on each further one
 */

/**
 * @typedef {Object} JavaDownloadFileSystem
 * @property {(path: string) => boolean} existsSync
 * @property {(path: string, options: {recursive: boolean}) => void} mkdirSync
 * @property {(path: string, options: RemovalOptions) => void} rmSync
 * @property {(oldPath: string, newPath: string) => void} renameSync
 * @property {(path: string) => import('node:fs').WriteStream} createWriteStream
 * @property {(path: string, options: {withFileTypes: true}) => DirectoryEntry[]} readdirSync
 */

/**
 * The subset of `child_process.spawnSync`'s return value this module reads.
 *
 * @typedef {Object} SpawnSyncResult
 * @property {Error} [error]
 * @property {number | null} status
 */

/**
 * @typedef {Object} DownloadCorrettoOptions
 * @property {(url: string) => Promise<DownloadFetchResponse>} fetch
 * @property {JavaDownloadFileSystem} fileSystem
 * @property {(command: string, args: string[]) => SpawnSyncResult} spawnSync no shell, ever
 * @property {() => string} resolveTarPath
 * @property {() => number} now epoch milliseconds
 * @property {(milliseconds: number) => Promise<void>} delay
 * @property {(archivePath: string, signatureBytes: Buffer) => Promise<boolean>} verifySignature the archive is passed
 *   as a path rather than as bytes, so that verifying it need not hold a few hundred megabytes in memory
 * @property {(progress: JavaDownloadProgress) => void} onProgress
 * @property {NodeJS.Platform} platform injected rather than read from `process.platform`, so a spec can exercise
 *   every platform branch on any host
 * @property {string} arch injected rather than read from `process.arch`, for the same reason
 * @property {number} [maxArchiveBytes] defaults to `MAX_ARCHIVE_BYTES`
 */

/**
 * The most a response body may write to the staging directory. A JDK archive is a few hundred megabytes, so this
 * bounds nothing genuine; what it bounds is a response that never ends, which the signature check cannot catch
 * because it only ever runs on a body that finished arriving. The cap is enforced on the bytes as they stream, not
 * on the `content-length` header, which is a claim by the same sender.
 *
 * @type {number}
 */
const MAX_ARCHIVE_BYTES = 1024 * 1024 * 1024;

/**
 * The most a detached signature may buffer into memory. A signature is small and fixed in size - the RSA-4096 packet
 * this app pins a key for stays under a kilobyte - so four kilobytes is headroom for subpackets rather than room for
 * anything genuine to grow into. The cap exists because the archive's own cap cannot cover this transfer: the `.sig`
 * URL is derived from wherever the archive's redirect chain landed, and a body read whole is allocated in full before
 * its length can be looked at, so this one is enforced on the bytes as they arrive too.
 *
 * @type {number}
 */
const MAX_SIGNATURE_BYTES = 4096;

/**
 * How often a refused directory operation is attempted again, and how long the wait before the next attempt grows by
 * each time - the same budget for a removal and for the rename, because the refusal they wait out is the same one.
 *
 * @type {number}
 */
const RETRY_ATTEMPTS = 10;
/** @type {number} */
const RETRY_DELAY_MILLIS = 200;

/**
 * Every removal here is issued with these. A removal is refused for as long as another process holds a handle
 * anywhere in the tree - a scanner or an indexer working through the few hundred megabytes that just appeared - and
 * is reported as `EPERM` or `ENOTEMPTY` rather than as anything resembling "try again", so the retries are what turn
 * the short-lived case of that into a wait instead of a failed download. One held for longer than the retries last
 * still fails, and then says so in the message.
 *
 * @satisfies {RemovalOptions}
 */
const REMOVAL_OPTIONS = {recursive: true, force: true, maxRetries: RETRY_ATTEMPTS, retryDelay: RETRY_DELAY_MILLIS};

/** @typedef {{file: string}} CorrettoArchive */

/** @type {number} */
const CORRETTO_VERSION = 25;

/** @type {Record<string, CorrettoArchive>} */
const CORRETTO_ARCHIVES = {
  'win32-x64': {file: `amazon-corretto-${CORRETTO_VERSION}-x64-windows-jdk.zip`},
  'darwin-arm64': {file: `amazon-corretto-${CORRETTO_VERSION}-aarch64-macos-jdk.tar.gz`},
  'linux-x64': {file: `amazon-corretto-${CORRETTO_VERSION}-x64-linux-jdk.tar.gz`}
};

/**
 * @param {NodeJS.Platform} platform
 * @param {string} arch
 * @returns {CorrettoArchive | null}
 */
function archiveFor(platform, arch) {
  return CORRETTO_ARCHIVES[`${platform}-${arch}`] ?? null;
}

/**
 * @param {string | null} headerValue
 * @returns {number | null}
 */
function parseContentLength(headerValue) {
  if (headerValue == null) {
    return null;
  }
  const parsed = Number.parseInt(headerValue, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Collects a response body into memory, ending the read with an error as soon as `maxBytes` is passed, so that a
 * sender deciding how much to send never decides how much this process allocates.
 *
 * @param {ReadableStream<Uint8Array>} body
 * @param {number} maxBytes
 * @returns {Promise<Buffer>}
 */
async function readSignatureBody(body, maxBytes) {
  /** @type {Buffer[]} */
  const chunks = [];
  let totalBytes = 0;

  await pipeline(Readable.fromWeb(/** @type {import('node:stream/web').ReadableStream} */ (body)), new Writable({
    write(chunk, _encoding, callback) {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        callback(new Error(`Signature exceeded ${maxBytes} bytes`));
        return;
      }
      chunks.push(chunk);
      callback(null);
    }
  }));

  return Buffer.concat(chunks);
}

/**
 * @param {(command: string, args: string[]) => SpawnSyncResult} spawnSync
 * @param {string} command
 * @param {string[]} args
 * @returns {void}
 */
function runCommand(spawnSync, command, args) {
  const result = spawnSync(command, args);
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with code ${result.status}`);
  }
}

/**
 * The one directory `tar` extracted into staging, resolved to the actual JDK home - on `darwin` that is nested one
 * level further, inside the extracted bundle's `Contents/Home`.
 *
 * @param {string} staging
 * @param {JavaDownloadFileSystem} fileSystem
 * @param {NodeJS.Platform} platform
 * @returns {string | null}
 */
function locateExtractedHome(staging, fileSystem, platform) {
  const extractedDirectory = fileSystem.readdirSync(staging, {withFileTypes: true}).find(entry => entry.isDirectory());
  if (extractedDirectory == null) {
    return null;
  }
  const extractedPath = path.join(staging, extractedDirectory.name);
  return platform === 'darwin' ? path.join(extractedPath, 'Contents', 'Home') : extractedPath;
}

/**
 * Moves `home` onto `target`, waiting a refusal out the way `REMOVAL_OPTIONS` has a removal wait one out, and for the
 * same reason: a directory another process holds a handle anywhere inside of cannot be moved either, and neither can
 * a name whose own removal is still pending - a few hundred megabytes of freshly extracted files are exactly what a
 * scanner is busy with at this moment. `renameSync` carries no retry budget of its own, so this one is spelled out.
 * The refusal of the last attempt is the one that escapes.
 *
 * @param {Pick<JavaDownloadFileSystem, 'renameSync'>} fileSystem
 * @param {(milliseconds: number) => Promise<void>} delay
 * @param {string} home
 * @param {string} target
 * @returns {Promise<void>}
 */
async function renameOnto(fileSystem, delay, home, target) {
  for (let attempt = 0; ; attempt++) {
    try {
      fileSystem.renameSync(home, target);
      return;
    } catch (error) {
      if (attempt >= RETRY_ATTEMPTS) {
        throw error;
      }
      await delay(RETRY_DELAY_MILLIS * (attempt + 1));
    }
  }
}

/**
 * @param {NodeJS.Platform} platform
 * @returns {string}
 */
function javaBinaryName(platform) {
  return platform === 'win32' ? 'java.exe' : 'java';
}

/**
 * @param {DownloadCorrettoOptions} options
 * @returns {Promise<JavaDownloadResult>}
 */
async function downloadCorretto(options) {
  const {fetch, fileSystem, spawnSync, resolveTarPath, now, delay, verifySignature, onProgress, platform, arch} = options;
  const maxArchiveBytes = options.maxArchiveBytes ?? MAX_ARCHIVE_BYTES;

  const archive = archiveFor(platform, arch);
  if (archive == null) {
    return {status: 'failed', message: `No automatic download available for ${platform}/${arch}`};
  }

  const target = downloadTarget();
  const staging = path.resolve('java-download');

  try {
    // inside the try: a working directory that cannot be written to fails here, and that is a failed download like
    // any other rather than a rejection escaping into the caller
    fileSystem.rmSync(staging, REMOVAL_OPTIONS);
    fileSystem.mkdirSync(staging, {recursive: true});

    const archiveUrl = `https://corretto.aws/downloads/latest/${archive.file}`;
    const archivePath = path.join(staging, archive.file);

    const response = await fetch(archiveUrl);
    if (!response.ok || response.body == null) {
      return {status: 'failed', message: `Failed to download ${archiveUrl}: HTTP ${response.status}`};
    }

    const reporter = createProgressReporter({now, totalBytes: parseContentLength(response.headers.get('content-length')), onProgress});
    const byteCounter = createByteCapTransform({maxBytes: maxArchiveBytes, onChunk: chunk => reporter.addBytes(chunk.length)});
    await pipeline(Readable.fromWeb(/** @type {import('node:stream/web').ReadableStream} */ (response.body)), byteCounter,
      fileSystem.createWriteStream(archivePath));
    reporter.flush();

    onProgress({phase: 'verifying', receivedBytes: 0, totalBytes: null, bytesPerSecond: 0, secondsRemaining: null});

    if (!response.url.startsWith('https://')) {
      return {status: 'failed', message: `Refusing to follow ${archiveUrl} to ${response.url}`};
    }

    const signatureUrl = `${response.url}.sig`;
    const signatureResponse = await fetch(signatureUrl);
    if (!signatureResponse.ok || signatureResponse.body == null) {
      return {status: 'failed', message: `Failed to download ${signatureUrl}: HTTP ${signatureResponse.status}`};
    }
    const signatureBytes = await readSignatureBody(signatureResponse.body, MAX_SIGNATURE_BYTES);

    if (!await verifySignature(archivePath, signatureBytes)) {
      return {status: 'failed', message: `Signature verification failed for ${archiveUrl}`};
    }

    onProgress({phase: 'extracting', receivedBytes: 0, totalBytes: null, bytesPerSecond: 0, secondsRemaining: null});

    runCommand(spawnSync, resolveTarPath(), ['-xf', archivePath, '-C', staging]);

    const home = locateExtractedHome(staging, fileSystem, platform);
    if (home == null) {
      return {status: 'failed', message: `Could not locate the extracted Java runtime under ${staging}`};
    }
    const extractedBinary = path.join(home, 'bin', javaBinaryName(platform));
    if (!fileSystem.existsSync(extractedBinary)) {
      return {status: 'failed', message: `Extracted runtime is missing ${extractedBinary}`};
    }

    fileSystem.rmSync(target, REMOVAL_OPTIONS);
    await renameOnto(fileSystem, delay, home, target);

    return {
      status: 'completed',
      javaPath: path.join(target, 'bin', javaBinaryName(platform)),
      signature: signatureBytes.toString('base64')
    };
  } catch (error) {
    return {status: 'failed', message: messageOf(error)};
  } finally {
    // a `finally` that throws replaces the `return` it runs after, so a removal refused here would discard the very
    // outcome it has nothing to say about - a runtime that is in place and verified, or a failure already diagnosed
    // as something else entirely. The directory then stays until the next download removes it, which is a removal
    // whose failure *is* an outcome, since nothing may be extracted into what is left of it.
    try {
      fileSystem.rmSync(staging, REMOVAL_OPTIONS);
    } catch {
      // deliberately swallowed, see above
    }
  }
}

/**
 * Where a download puts the runtime: `java` in the app's working directory, on every platform. Nothing resolves Java
 * from here - a downloaded runtime is only ever reached through the path the config records.
 *
 * @returns {string}
 */
function downloadTarget() {
  return path.resolve('java');
}

/**
 * @returns {string}
 */
function resolveTarPath() {
  if (process.platform === 'win32') {
    return path.join(process.env['SystemRoot'] ?? 'C:\\Windows', 'System32', 'tar.exe');
  }
  return '/usr/bin/tar';
}

module.exports = {downloadCorretto, downloadTarget, resolveTarPath};
