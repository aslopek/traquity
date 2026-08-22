const {beforeEach, describe, expect, it, jest} = require('@jest/globals');
const path = require('node:path');
const {Writable} = require('node:stream');

jest.mock('../download/cancel-body.js', () => ({cancelBody: jest.fn()}));

const {downloadCorretto} = require('./corretto-download.js');
const {cancelBody} = require('../download/cancel-body.js');

const cancelBodyMock = /** @type {jest.Mock<(body: ReadableStream<Uint8Array> | null) => Promise<void>>} */ (/** @type {unknown} */ (cancelBody));

/** @import {DownloadCorrettoOptions, DownloadFetchResponse, JavaDownloadFileSystem, JavaDownloadProgress, SpawnSyncResult}
 *   from './corretto-download.js' */

/**
 * @param {Buffer[]} chunks
 * @returns {ReadableStream<Uint8Array>}
 */
function streamOf(chunks) {
  return new ReadableStream({
    start(controller) {
      chunks.forEach(chunk => controller.enqueue(chunk));
      controller.close();
    }
  });
}

/**
 * @param {{ok?: boolean, status?: number, url: string, totalBytes?: number | null, chunks?: Buffer[]}} options
 * @returns {DownloadFetchResponse}
 */
function archiveResponse(options) {
  const {ok = true, status = 200, url, totalBytes = null, chunks = [Buffer.from('a'.repeat(10))]} = options;
  return {
    ok,
    status,
    url,
    headers: {get: (name) => name === 'content-length' && totalBytes != null ? String(totalBytes) : null},
    body: ok ? streamOf(chunks) : null
  };
}

/**
 * @param {{ok?: boolean, status?: number, signatureBytes: Buffer}} options
 * @returns {DownloadFetchResponse}
 */
function signatureResponse(options) {
  const {ok = true, status = 200, signatureBytes} = options;
  return {
    ok,
    status,
    url: '',
    headers: {get: () => null},
    body: ok ? streamOf([signatureBytes]) : null
  };
}

describe('downloadCorretto', () => {
  const archiveUrl = 'https://corretto.aws/downloads/latest/amazon-corretto-25-x64-linux-jdk.tar.gz';
  const signatureBytes = Buffer.from('fixture signature bytes');
  /** @type {string} the single directory `tar` leaves in staging, as `readdirSync` reports it below */
  const extractedDirectory = 'amazon-corretto-25-linux-x64';

  /** @type {jest.Mock<DownloadCorrettoOptions['fetch']>} */
  const fetch = jest.fn();
  const existsSync = jest.fn(/** @type {JavaDownloadFileSystem['existsSync']} */ (() => true));
  const mkdirSync = jest.fn(/** @type {JavaDownloadFileSystem['mkdirSync']} */ (() => undefined));
  const rmSync = jest.fn(/** @type {JavaDownloadFileSystem['rmSync']} */ (() => undefined));
  const renameSync = jest.fn(/** @type {JavaDownloadFileSystem['renameSync']} */ (() => undefined));
  const readdirSync = jest.fn(/** @type {JavaDownloadFileSystem['readdirSync']} */
    (() => [{name: extractedDirectory, isDirectory: () => true}]));
  const createWriteStream = jest.fn(/** @type {JavaDownloadFileSystem['createWriteStream']} */
    (() => /** @type {import('node:fs').WriteStream} */ (/** @type {unknown} */ (new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      }
    })))));
  const spawnSync = jest.fn(/** @type {(command: string, args: string[]) => SpawnSyncResult} */ (() => ({status: 0})));
  const resolveTarPath = jest.fn(() => 'tar');
  const delay = jest.fn(/** @type {DownloadCorrettoOptions['delay']} */ (() => Promise.resolve()));
  const verifySignature = jest.fn(/** @type {DownloadCorrettoOptions['verifySignature']} */ (() => Promise.resolve(true)));
  const onProgress = jest.fn(/** @type {(progress: JavaDownloadProgress) => void} */ (() => undefined));

  /** @type {number} */
  let clock;
  const now = jest.fn(() => clock);

  /** @type {JavaDownloadFileSystem} */
  let fileSystem;

  /** @type {DownloadCorrettoOptions} */
  let options;

  beforeEach(() => {
    jest.clearAllMocks();
    clock = 0;
    existsSync.mockReturnValue(true);
    mkdirSync.mockImplementation(() => undefined);
    rmSync.mockImplementation(() => undefined);
    renameSync.mockImplementation(() => undefined);
    delay.mockResolvedValue(undefined);
    readdirSync.mockReturnValue([{name: extractedDirectory, isDirectory: () => true}]);
    spawnSync.mockReturnValue({status: 0});
    verifySignature.mockResolvedValue(true);
    fetch.mockImplementation((url) => Promise.resolve(
      url.endsWith('.sig') ? signatureResponse({signatureBytes}) : archiveResponse({url: archiveUrl})
    ));

    fileSystem = {existsSync, mkdirSync, rmSync, renameSync, createWriteStream, readdirSync};

    options = {
      fetch,
      fileSystem,
      spawnSync,
      resolveTarPath,
      now,
      delay,
      verifySignature,
      onProgress,
      platform: 'linux',
      arch: 'x64'
    };
  });

  it('completes, returning the extracted binary path and the base64 of the verified signature', async () => {
    await expect(downloadCorretto(options)).resolves.toEqual({
      status: 'completed',
      javaPath: path.join(path.resolve('java'), 'bin', 'java'),
      signature: signatureBytes.toString('base64')
    });
  });

  it('replaces an existing target directory rather than merging into it', async () => {
    const target = path.resolve('java');
    const staging = path.resolve('java-download');

    await downloadCorretto(options);

    expect(rmSync.mock.calls).toEqual([
      [staging, {recursive: true, force: true, maxRetries: 10, retryDelay: 200}],
      [target, {recursive: true, force: true, maxRetries: 10, retryDelay: 200}],
      [staging, {recursive: true, force: true, maxRetries: 10, retryDelay: 200}]
    ]);
    expect(renameSync).toHaveBeenCalledTimes(1);
    expect(renameSync).toHaveBeenCalledWith(path.join(staging, extractedDirectory), target);
  });

  it('fails without throwing when the staging directory cannot be prepared', async () => {
    mkdirSync.mockImplementation(() => {
      throw new Error('EACCES: permission denied');
    });

    await expect(downloadCorretto(options)).resolves.toEqual({status: 'failed', message: 'EACCES: permission denied'});
    expect(fetch).not.toHaveBeenCalled();
  });

  it('removes the staging directory in the end', async () => {
    const target = path.resolve('java');
    const staging = path.resolve('java-download');

    await downloadCorretto(options);

    expect(rmSync.mock.calls).toEqual([
      [staging, {recursive: true, force: true, maxRetries: 10, retryDelay: 200}],
      [target, {recursive: true, force: true, maxRetries: 10, retryDelay: 200}],
      [staging, {recursive: true, force: true, maxRetries: 10, retryDelay: 200}]
    ]);
    expect(rmSync.mock.invocationCallOrder[2] ?? -1).toBeGreaterThan(renameSync.mock.invocationCallOrder[0] ?? -1);
  });

  describe('when a removal is refused for as long as it is retried', () => {
    /** @type {string} */
    let staging;

    beforeEach(() => {
      staging = path.resolve('java-download');
      rmSync.mockImplementation((removedPath) => {
        // the extraction has run by the time the removal in the end is reached, and by none of the earlier ones
        if (removedPath === staging && spawnSync.mock.calls.length > 0) {
          throw new Error('ENOTEMPTY: directory not empty');
        }
      });
    });

    it('keeps the completed result, leaving the staging directory behind', async () => {
      await expect(downloadCorretto(options)).resolves.toEqual({
        status: 'completed',
        javaPath: path.join(path.resolve('java'), 'bin', 'java'),
        signature: signatureBytes.toString('base64')
      });
    });

    it('keeps the diagnosed failure rather than reporting the leftover instead', async () => {
      spawnSync.mockReturnValue({status: 1});

      await expect(downloadCorretto(options)).resolves.toEqual({
        status: 'failed',
        message: expect.stringContaining('exited with code 1')
      });
    });

    it('fails on the leftover of an earlier download, fetching nothing', async () => {
      rmSync.mockImplementation(() => {
        throw new Error('ENOTEMPTY: directory not empty');
      });

      await expect(downloadCorretto(options)).resolves.toEqual({
        status: 'failed',
        message: 'ENOTEMPTY: directory not empty'
      });
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('when the rename onto the target is refused', () => {
    /** @type {string} */
    let home;
    /** @type {string} */
    let target;

    beforeEach(() => {
      home = path.join(path.resolve('java-download'), extractedDirectory);
      target = path.resolve('java');
    });

    it('waits and tries again, completing once it goes through', async () => {
      let refusals = 0;
      renameSync.mockImplementation(() => {
        if (refusals++ < 2) {
          throw new Error('EPERM: operation not permitted, rename');
        }
      });

      await expect(downloadCorretto(options)).resolves.toEqual({
        status: 'completed',
        javaPath: path.join(target, 'bin', 'java'),
        signature: signatureBytes.toString('base64')
      });
      expect(renameSync.mock.calls).toEqual([[home, target], [home, target], [home, target]]);
      expect(delay.mock.calls).toEqual([[200], [400]]);
    });

    it('gives up after the retries, reporting the refusal it was given', async () => {
      renameSync.mockImplementation(() => {
        throw new Error('EPERM: operation not permitted, rename');
      });

      await expect(downloadCorretto(options)).resolves.toEqual({
        status: 'failed',
        message: 'EPERM: operation not permitted, rename'
      });
      expect(renameSync).toHaveBeenCalledTimes(11);
      expect(renameSync).toHaveBeenCalledWith(home, target);
      expect(delay.mock.calls).toEqual([[200], [400], [600], [800], [1000], [1200], [1400], [1600], [1800], [2000]]);
    });
  });

  describe.each([
    ['win32', 'x64', 'amazon-corretto-25-x64-windows-jdk.zip'],
    ['darwin', 'arm64', 'amazon-corretto-25-aarch64-macos-jdk.tar.gz'],
    ['linux', 'x64', 'amazon-corretto-25-x64-linux-jdk.tar.gz']
  ])('on %s/%s', (platform, arch, file) => {
    beforeEach(() => {
      options.platform = /** @type {NodeJS.Platform} */ (platform);
      options.arch = arch;
    });

    it(`downloads ${file}`, async () => {
      await downloadCorretto(options);

      expect(fetch.mock.calls).toEqual([
        [`https://corretto.aws/downloads/latest/${file}`],
        [`${archiveUrl}.sig`]
      ]);
    });
  });

  it('fails immediately for an unsupported platform, fetching nothing', async () => {
    options.platform = 'darwin';
    options.arch = 'x64';

    await expect(downloadCorretto(options)).resolves.toEqual({
      status: 'failed',
      message: 'No automatic download available for darwin/x64'
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails on a non-ok archive response, extracting nothing and cancelling any body it carries', async () => {
    const body = streamOf([Buffer.from('error page')]);
    fetch.mockImplementation(() => Promise.resolve({ok: false, status: 503, url: archiveUrl, headers: {get: () => null}, body}));

    await expect(downloadCorretto(options)).resolves.toEqual({
      status: 'failed',
      message: expect.stringContaining('503')
    });
    expect(spawnSync).not.toHaveBeenCalled();
    expect(cancelBodyMock).toHaveBeenCalledTimes(1);
    expect(cancelBodyMock).toHaveBeenCalledWith(body);
  });

  it('fails on a non-ok signature response, verifying nothing and cancelling any body it carries', async () => {
    const body = streamOf([Buffer.from('error page')]);
    fetch.mockImplementation((url) => Promise.resolve(
      url.endsWith('.sig')
        ? {ok: false, status: 503, url, headers: {get: () => null}, body}
        : archiveResponse({url: archiveUrl})
    ));

    await expect(downloadCorretto(options)).resolves.toEqual({
      status: 'failed',
      message: expect.stringContaining('503')
    });
    expect(verifySignature).not.toHaveBeenCalled();
    expect(cancelBodyMock).toHaveBeenCalledTimes(1);
    expect(cancelBodyMock).toHaveBeenCalledWith(body);
  });

  it('fetches the signature from the redirect-resolved URL of the archive response, not the request URL', async () => {
    const resolvedUrl = 'https://d1.cloudfront.net/redirected/amazon-corretto-25-x64-linux-jdk.tar.gz';
    fetch.mockImplementation((url) => Promise.resolve(
      url.endsWith('.sig') ? signatureResponse({signatureBytes}) : archiveResponse({url: resolvedUrl})
    ));

    await downloadCorretto(options);

    expect(fetch.mock.calls).toEqual([
      [archiveUrl],
      [`${resolvedUrl}.sig`]
    ]);
  });

  it('fails a redirect chain that left https, fetching no signature', async () => {
    const plaintextUrl = 'http://d1.cloudfront.net/redirected/amazon-corretto-25-x64-linux-jdk.tar.gz';
    fetch.mockImplementation((url) => Promise.resolve(
      url.endsWith('.sig') ? signatureResponse({signatureBytes}) : archiveResponse({url: plaintextUrl})
    ));

    await expect(downloadCorretto(options)).resolves.toEqual({
      status: 'failed',
      message: `Refusing to follow ${archiveUrl} to ${plaintextUrl}`
    });
    expect(fetch.mock.calls).toEqual([[archiveUrl]]);
    expect(verifySignature).not.toHaveBeenCalled();
  });

  it('fails a body that writes more than the archive size cap, extracting nothing', async () => {
    options.maxArchiveBytes = 16;
    fetch.mockImplementation((url) => Promise.resolve(
      url.endsWith('.sig')
        ? signatureResponse({signatureBytes})
        : archiveResponse({url: archiveUrl, chunks: [Buffer.alloc(16, 0x61), Buffer.alloc(1, 0x61)]})
    ));

    await expect(downloadCorretto(options)).resolves.toEqual({
      status: 'failed',
      message: 'Stream exceeded 16 bytes'
    });
    expect(verifySignature).not.toHaveBeenCalled();
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('lets a body that stays within the archive size cap through', async () => {
    options.maxArchiveBytes = 16;
    fetch.mockImplementation((url) => Promise.resolve(
      url.endsWith('.sig') ? signatureResponse({signatureBytes}) : archiveResponse({url: archiveUrl, chunks: [Buffer.alloc(16, 0x61)]})
    ));

    await expect(downloadCorretto(options)).resolves.toEqual(expect.objectContaining({status: 'completed'}));
  });

  it('fails a signature body longer than the signature size cap, extracting nothing', async () => {
    fetch.mockImplementation((url) => Promise.resolve(
      url.endsWith('.sig')
        ? signatureResponse({signatureBytes: Buffer.alloc(4096 + 1, 0x61)})
        : archiveResponse({url: archiveUrl})
    ));

    await expect(downloadCorretto(options)).resolves.toEqual({
      status: 'failed',
      message: 'Signature exceeded 4096 bytes'
    });
    expect(verifySignature).not.toHaveBeenCalled();
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('lets a signature that stays within the signature size cap through', async () => {
    const cappedSignature = Buffer.alloc(4096, 0x61);
    fetch.mockImplementation((url) => Promise.resolve(
      url.endsWith('.sig') ? signatureResponse({signatureBytes: cappedSignature}) : archiveResponse({url: archiveUrl})
    ));

    await expect(downloadCorretto(options)).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      signature: cappedSignature.toString('base64')
    }));
  });

  it('hands the staged archive over for verification as a path, together with the fetched signature', async () => {
    const stagedArchive = path.join(path.resolve('java-download'), 'amazon-corretto-25-x64-linux-jdk.tar.gz');

    await downloadCorretto(options);

    expect(verifySignature).toHaveBeenCalledTimes(1);
    expect(verifySignature).toHaveBeenCalledWith(stagedArchive, signatureBytes);
  });

  describe('when the signature is rejected', () => {
    beforeEach(() => {
      verifySignature.mockResolvedValue(false);
    });

    it('fails, naming the verification rather than the transfer', async () => {
      await expect(downloadCorretto(options)).resolves.toEqual({
        status: 'failed',
        message: expect.stringContaining('Signature verification failed')
      });
    });

    it('extracts nothing and leaves the target untouched', async () => {
      await downloadCorretto(options);

      expect(spawnSync).not.toHaveBeenCalled();
      expect(renameSync).not.toHaveBeenCalled();
      expect(rmSync).not.toHaveBeenCalledWith(path.resolve('java'), expect.anything());
    });

    it('still removes the staging directory', async () => {
      const staging = path.resolve('java-download');

      await downloadCorretto(options);

      expect(rmSync.mock.calls).toEqual([
        [staging, {recursive: true, force: true, maxRetries: 10, retryDelay: 200}],
        [staging, {recursive: true, force: true, maxRetries: 10, retryDelay: 200}]
      ]);
    });
  });

  it('names the cause of a rejected fetch, which is where the reason of one is', async () => {
    fetch.mockRejectedValue(new TypeError('fetch failed', {cause: new Error('getaddrinfo ENOTFOUND corretto.aws')}));

    await expect(downloadCorretto(options)).resolves.toEqual({
      status: 'failed',
      message: 'fetch failed: getaddrinfo ENOTFOUND corretto.aws'
    });
  });

  it('stops following a cyclic cause chain', async () => {
    const outer = new Error('outer');
    const inner = new Error('inner', {cause: outer});
    outer.cause = inner;
    fetch.mockRejectedValue(outer);

    await expect(downloadCorretto(options)).resolves.toEqual({
      status: 'failed',
      message: [outer, inner, outer, inner, outer].map(error => error.message).join(': ')
    });
  });

  it('fails without throwing when verification cannot conclude, extracting nothing', async () => {
    verifySignature.mockRejectedValue(new Error('ENOENT'));

    await expect(downloadCorretto(options)).resolves.toEqual({status: 'failed', message: 'ENOENT'});
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('fails when tar exits with a non-zero status, leaving the target untouched', async () => {
    spawnSync.mockReturnValue({status: 1});

    await expect(downloadCorretto(options)).resolves.toEqual({
      status: 'failed',
      message: expect.stringContaining('exited with code 1')
    });
    expect(renameSync).not.toHaveBeenCalled();
  });

  it('fails when no directory was extracted', async () => {
    readdirSync.mockReturnValue([]);

    await expect(downloadCorretto(options)).resolves.toEqual({
      status: 'failed',
      message: expect.stringContaining('Could not locate')
    });
  });

  it('fails when the extracted runtime has no java binary', async () => {
    existsSync.mockReturnValue(false);

    await expect(downloadCorretto(options)).resolves.toEqual({
      status: 'failed',
      message: expect.stringContaining('missing')
    });
  });

  it('locates the home one level deeper on darwin, inside Contents/Home', async () => {
    options.platform = 'darwin';
    options.arch = 'arm64';
    const expectedHome = path.join(path.resolve('java-download'), extractedDirectory, 'Contents', 'Home');

    await downloadCorretto(options);

    expect(renameSync).toHaveBeenCalledTimes(1);
    expect(renameSync).toHaveBeenCalledWith(expectedHome, path.resolve('java'));
  });

  it('reports the phases in order: downloading, verifying, extracting', async () => {
    await downloadCorretto(options);

    const phases = onProgress.mock.calls.map(([progress]) => progress.phase);
    expect(phases.length).toBeGreaterThanOrEqual(3); // there might be multiple occurrences of 'downloading'
    expect(phases[0]).toBe('downloading');
    expect(phases[phases.length - 2]).toBe('verifying');
    expect(phases[phases.length - 1]).toBe('extracting');
  });

  it('reports verifying and extracting with no byte count', async () => {
    await downloadCorretto(options);

    const verifying = onProgress.mock.calls.map(([progress]) => progress).find(progress => progress.phase === 'verifying');
    const extracting = onProgress.mock.calls.map(([progress]) => progress).find(progress => progress.phase === 'extracting');
    expect(verifying).toEqual({phase: 'verifying', receivedBytes: 0, totalBytes: null, bytesPerSecond: 0, secondsRemaining: null});
    expect(extracting).toEqual({phase: 'extracting', receivedBytes: 0, totalBytes: null, bytesPerSecond: 0, secondsRemaining: null});
  });

  it('throttles 20 chunks into the first event and the forced flush carrying the true byte count', async () => {
    const chunkSize = 1024;
    const chunks = Array.from({length: 20}, () => Buffer.alloc(chunkSize));
    const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    fetch.mockImplementation((url) => Promise.resolve(
      url.endsWith('.sig') ? signatureResponse({signatureBytes}) : archiveResponse({url: archiveUrl, chunks})
    ));

    await downloadCorretto(options);

    const downloadingEvents = onProgress.mock.calls.map(([progress]) => progress).filter(progress => progress.phase === 'downloading');
    // the clock never advances, so every chunk after the first is suppressed and only `flush` gets another event out
    expect(downloadingEvents).toEqual([
      {
        phase: 'downloading',
        receivedBytes: chunkSize,
        totalBytes: null,
        bytesPerSecond: 0,
        secondsRemaining: null
      },
      {
        phase: 'downloading',
        receivedBytes: totalBytes,
        totalBytes: null,
        bytesPerSecond: 0,
        secondsRemaining: null
      }
    ]);
  });

  it('computes bytesPerSecond over the rolling window rather than cumulatively since the start', async () => {
    const chunkSize = 1024;
    const chunks = [Buffer.alloc(chunkSize), Buffer.alloc(chunkSize)];
    const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    let callCount = 0;
    now.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 0 : 1000;
    });
    fetch.mockImplementation((url) => Promise.resolve(
      url.endsWith('.sig')
        ? signatureResponse({signatureBytes})
        : archiveResponse({url: archiveUrl, totalBytes, chunks})
    ));

    await downloadCorretto(options);

    const downloadingEvents = onProgress.mock.calls.map(([progress]) => progress).filter(progress => progress.phase === 'downloading');
    // the window opens at the first sample, so the second chunk alone spans the one second - cumulatively it would be `totalBytes`
    expect(downloadingEvents).toEqual([
      {
        phase: 'downloading',
        receivedBytes: chunkSize,
        totalBytes,
        bytesPerSecond: 0,
        secondsRemaining: null
      },
      {
        phase: 'downloading',
        receivedBytes: totalBytes,
        totalBytes,
        bytesPerSecond: chunkSize,
        secondsRemaining: 0
      },
      {
        phase: 'downloading',
        receivedBytes: totalBytes,
        totalBytes,
        bytesPerSecond: chunkSize,
        secondsRemaining: 0
      }
    ]);
  });

  it('drops samples older than the speed window, so a slow start stops weighing on the reported rate', async () => {
    const chunkSize = 1000;
    const chunks = Array.from({length: 4}, () => Buffer.alloc(chunkSize));
    const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    // the third chunk lands 7s in, ageing the first two out of the 5s window, and the fourth follows one second later
    const times = [0, 1000, 7000, 8000];
    let callCount = 0;
    now.mockImplementation(() => times[Math.min(callCount++, times.length - 1)] ?? 0);
    fetch.mockImplementation((url) => Promise.resolve(
      url.endsWith('.sig')
        ? signatureResponse({signatureBytes})
        : archiveResponse({url: archiveUrl, totalBytes, chunks})
    ));

    await downloadCorretto(options);

    const downloadingEvents = onProgress.mock.calls.map(([progress]) => progress).filter(progress => progress.phase === 'downloading');

    expect(downloadingEvents).toEqual([
      {
        phase: 'downloading',
        receivedBytes: chunkSize,
        totalBytes,
        bytesPerSecond: 0,
        secondsRemaining: null
      },
      {
        phase: 'downloading',
        receivedBytes: 2 * chunkSize,
        totalBytes,
        bytesPerSecond: chunkSize,
        secondsRemaining: 2
      },
      // the third chunk evicted every earlier sample, leaving one whose timestamp is the current time - no span, no rate
      {
        phase: 'downloading',
        receivedBytes: 3 * chunkSize,
        totalBytes,
        bytesPerSecond: 0,
        secondsRemaining: null
      },
      {
        phase: 'downloading',
        receivedBytes: totalBytes,
        totalBytes,
        bytesPerSecond: chunkSize,
        secondsRemaining: 0
      },
      {
        phase: 'downloading',
        receivedBytes: totalBytes,
        totalBytes,
        bytesPerSecond: chunkSize,
        secondsRemaining: 0
      }
    ]);
  });
});
