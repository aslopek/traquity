const {beforeEach, describe, expect, it, jest} = require('@jest/globals');
const crypto = require('node:crypto');
const path = require('node:path');
const {Writable} = require('node:stream');

jest.mock('../download/cancel-body.js', () => ({cancelBody: jest.fn()}));

const {downloadModel, pinnedUrlFor} = require('./model-download.js');
const {cancelBody} = require('../download/cancel-body.js');

const cancelBodyMock = /** @type {jest.Mock<(body: ReadableStream<Uint8Array> | null) => Promise<void>>} */ (/** @type {unknown} */ (cancelBody));

/** @import {AiDownloadProgress, DownloadFetchResponse, DownloadModelOptions, ModelDownloadFileSystem} from './model-download.js' */

/** @import {CatalogueRecord} from './catalogue.js' */

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
 * @param {{ok?: boolean, status?: number, url: string, chunks?: Buffer[]}} options
 * @returns {DownloadFetchResponse}
 */
function modelResponse(options) {
  const {ok = true, status = 200, url, chunks} = options;
  return {ok, status, url, body: ok ? streamOf(chunks ?? [Buffer.from('model bytes')]) : null};
}

/**
 * A `fs.createWriteStream()` stub: a `Writable` that discards everything written to it, failing the write with
 * `error` when given one.
 *
 * @param {Error} [error]
 * @returns {import('node:fs').WriteStream}
 */
function stubWriteStream(error) {
  const writable = new Writable({
    write(_chunk, _encoding, callback) {
      callback(error);
    }
  });
  return /** @type {import('node:fs').WriteStream} */ (/** @type {unknown} */ (writable));
}

describe('downloadModel', () => {
  const targetDirectory = 'D:\\downloads\\my-model';
  const modelSha256 = 'c2be4d2a8d7e9dbd234727cdeddb2cbd727d73e3b7922cee085b50d7c7cde487';

  /** @type {Buffer} */
  let modelBytes;

  /** @type {CatalogueRecord} */
  let entry;

  const url = 'https://huggingface.co/org/model-a/resolve/4168f45a16a1290d65a4ec0fa312ae917a4c15d6/model-a.gguf';
  const stagingPath = path.join(targetDirectory, 'model-a.gguf.download');
  const finalPath = path.join(targetDirectory, 'model-a.gguf');

  /** @type {jest.Mock<DownloadModelOptions['fetch']>} */
  const fetch = jest.fn();
  const rmSync = jest.fn(/** @type {ModelDownloadFileSystem['rmSync']} */ (() => undefined));
  const renameSync = jest.fn(/** @type {ModelDownloadFileSystem['renameSync']} */ (() => undefined));
  const createWriteStream = jest.fn(/** @type {ModelDownloadFileSystem['createWriteStream']} */ (() => stubWriteStream()));
  const onProgress = jest.fn(/** @type {(progress: AiDownloadProgress) => void} */ (() => undefined));

  /** @type {number} */
  let clock;
  const now = jest.fn(() => clock);

  /** @type {ModelDownloadFileSystem} */
  let fileSystem;

  /** @type {DownloadModelOptions} */
  let options;

  beforeEach(() => {
    jest.clearAllMocks();
    clock = 0;
    modelBytes = Buffer.from('the actual gguf weights');
    entry = {
      key: 'model-a',
      description: 'Model A',
      sizeBytes: modelBytes.length,
      license: 'Apache-2.0',
      requiredVram: 5_000_000_000,
      repo: 'org/model-a',
      revision: '4168f45a16a1290d65a4ec0fa312ae917a4c15d6',
      file: 'model-a.gguf',
      sha256: modelSha256
    };
    rmSync.mockImplementation(() => undefined);
    renameSync.mockImplementation(() => undefined);
    fetch.mockImplementation(() => Promise.resolve(modelResponse({url, chunks: [modelBytes]})));

    fileSystem = {rmSync, renameSync, createWriteStream};

    options = {entry, targetDirectory, fetch, fileSystem, now, onProgress};
  });

  it('builds the pinned URL from the entry\'s own repo, revision and file', () => {
    expect(pinnedUrlFor(entry)).toBe(url);
  });

  it('fetches exactly the pinned URL', async () => {
    await downloadModel(options);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(url);
  });

  it('completes, staging then renaming into the final path inside the target directory', async () => {
    await expect(downloadModel(options)).resolves.toEqual({status: 'completed', path: finalPath});
    expect(renameSync).toHaveBeenCalledTimes(1);
    expect(renameSync).toHaveBeenCalledWith(stagingPath, finalPath);
  });

  it('fails on a non-ok response, writing nothing and cancelling any body it carries', async () => {
    const body = streamOf([Buffer.from('error page')]);
    fetch.mockImplementation(() => Promise.resolve({ok: false, status: 503, url, body}));

    await expect(downloadModel(options)).resolves.toEqual({
      status: 'failed',
      message: expect.stringContaining('503')
    });
    expect(createWriteStream).not.toHaveBeenCalled();
    expect(renameSync).not.toHaveBeenCalled();
    expect(cancelBodyMock).toHaveBeenCalledTimes(1);
    expect(cancelBodyMock).toHaveBeenCalledWith(body);
  });

  it('fails a redirect chain that left https, writing nothing and cancelling the body', async () => {
    const plaintextUrl = 'http://cdn.example.com/redirected/model-a.gguf';
    const response = modelResponse({url: plaintextUrl, chunks: [modelBytes]});
    fetch.mockImplementation(() => Promise.resolve(response));

    await expect(downloadModel(options)).resolves.toEqual({
      status: 'failed',
      message: `Refusing to follow ${url} to ${plaintextUrl}`
    });
    expect(createWriteStream).not.toHaveBeenCalled();
    expect(cancelBodyMock).toHaveBeenCalledTimes(1);
    expect(cancelBodyMock).toHaveBeenCalledWith(response.body);
  });

  it('fails a body exceeding the catalogue size plus the 1% margin, removing the staged file', async () => {
    const oversized = Buffer.alloc(Math.ceil(entry.sizeBytes * 1.01) + 1, 0x61);
    fetch.mockImplementation(() => Promise.resolve(modelResponse({url, chunks: [oversized]})));

    await expect(downloadModel(options)).resolves.toEqual({
      status: 'failed',
      message: expect.stringContaining('Stream exceeded')
    });
    expect(renameSync).not.toHaveBeenCalled();
    expect(rmSync).toHaveBeenCalledWith(stagingPath, {force: true});
  });

  it('lets a body within the size cap through', async () => {
    const maxed = Buffer.alloc(Math.ceil(entry.sizeBytes * 1.01), 0x61);
    const digest = crypto.createHash('sha256').update(maxed).digest('hex');
    fetch.mockImplementation(() => Promise.resolve(modelResponse({url, chunks: [maxed]})));

    await expect(downloadModel({...options, entry: {...entry, sha256: digest}}))
      .resolves.toEqual({status: 'completed', path: finalPath});
  });

  it('fails a mismatching hash, removing the staged file and renaming nothing', async () => {
    fetch.mockImplementation(() => Promise.resolve(modelResponse({url, chunks: [Buffer.from('tampered weights')]})));

    await expect(downloadModel(options)).resolves.toEqual({
      status: 'failed',
      message: `Hash verification failed for ${url}`
    });
    expect(renameSync).not.toHaveBeenCalled();
    expect(rmSync).toHaveBeenCalledWith(stagingPath, {force: true});
  });

  it('completes on a matching hash without removing the staged file', async () => {
    await downloadModel(options);

    expect(rmSync).not.toHaveBeenCalled();
  });

  it('removes the staged file when the write side rejects', async () => {
    createWriteStream.mockReturnValueOnce(stubWriteStream(new Error('ENOSPC: no space left on device')));

    await expect(downloadModel(options)).resolves.toEqual({status: 'failed', message: 'ENOSPC: no space left on device'});
    expect(rmSync).toHaveBeenCalledWith(stagingPath, {force: true});
    expect(renameSync).not.toHaveBeenCalled();
  });

  it('names the cause of a rejected fetch, which is where the reason of one is', async () => {
    fetch.mockRejectedValue(new TypeError('fetch failed', {cause: new Error('getaddrinfo ENOTFOUND huggingface.co')}));

    await expect(downloadModel(options)).resolves.toEqual({
      status: 'failed',
      message: 'fetch failed: getaddrinfo ENOTFOUND huggingface.co'
    });
  });

  it('reports the phases in order: downloading, verifying, installing', async () => {
    await downloadModel(options);

    const phases = onProgress.mock.calls.map(([progress]) => progress.phase);
    expect(phases.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < phases.length - 2; i++) {
      expect(phases[i]).toBe('downloading');
    }
    expect(phases[phases.length - 2]).toBe('verifying');
    expect(phases[phases.length - 1]).toBe('installing');
  });

  it('reports verifying with no byte count', async () => {
    await downloadModel(options);

    const verifying = onProgress.mock.calls.map(([progress]) => progress).find(progress => progress.phase === 'verifying');
    expect(verifying).toEqual({phase: 'verifying', receivedBytes: 0, totalBytes: null, bytesPerSecond: 0, secondsRemaining: null});
  });

  it('reports installing with no byte count', async () => {
    await downloadModel(options);

    const installing = onProgress.mock.calls.map(([progress]) => progress).find(progress => progress.phase === 'installing');
    expect(installing).toEqual({phase: 'installing', receivedBytes: 0, totalBytes: null, bytesPerSecond: 0, secondsRemaining: null});
  });

  it('reports installing before renaming the staged file into place', async () => {
    renameSync.mockImplementation(() => {
      const phases = onProgress.mock.calls.map(([progress]) => progress.phase);
      expect(phases[phases.length - 1]).toBe('installing');
    });

    await downloadModel(options);

    expect(renameSync).toHaveBeenCalledTimes(1);
  });

  it('reports downloading progress against the catalogue\'s exact size, not a content-length header', async () => {
    await downloadModel(options);

    const downloadingEvents = onProgress.mock.calls.map(([progress]) => progress).filter(progress => progress.phase === 'downloading');
    // the throttled emit for the one chunk already carries the full byte count, so the unconditional flush after it
    // duplicates the same event rather than adding a new one - the clock never advances between the two
    expect(downloadingEvents).toEqual([
      {phase: 'downloading', receivedBytes: modelBytes.length, totalBytes: entry.sizeBytes, bytesPerSecond: 0, secondsRemaining: null},
      {phase: 'downloading', receivedBytes: modelBytes.length, totalBytes: entry.sizeBytes, bytesPerSecond: 0, secondsRemaining: null}
    ]);
  });

  it('computes bytesPerSecond over the rolling window rather than cumulatively since the start', async () => {
    const chunkSize = 8;
    const firstChunk = modelBytes.subarray(0, chunkSize);
    const secondChunk = modelBytes.subarray(chunkSize);
    let callCount = 0;
    now.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 0 : 1000;
    });
    fetch.mockImplementation(() => Promise.resolve(modelResponse({url, chunks: [firstChunk, secondChunk]})));

    await downloadModel(options);

    const downloadingEvents = onProgress.mock.calls.map(([progress]) => progress).filter(progress => progress.phase === 'downloading');
    // one second elapses between the two chunks, so the rolling window reports the second chunk's own size as the
    // rate rather than the cumulative total; the flush after the pipeline ends duplicates that same event again
    expect(downloadingEvents).toEqual([
      {
        phase: 'downloading',
        receivedBytes: firstChunk.length,
        totalBytes: entry.sizeBytes,
        bytesPerSecond: 0,
        secondsRemaining: null
      },
      {
        phase: 'downloading',
        receivedBytes: modelBytes.length,
        totalBytes: entry.sizeBytes,
        bytesPerSecond: secondChunk.length,
        secondsRemaining: 0
      },
      {
        phase: 'downloading',
        receivedBytes: modelBytes.length,
        totalBytes: entry.sizeBytes,
        bytesPerSecond: secondChunk.length,
        secondsRemaining: 0
      }
    ]);
  });
});
