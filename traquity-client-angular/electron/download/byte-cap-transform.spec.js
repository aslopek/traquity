const {beforeEach, describe, expect, it, jest} = require('@jest/globals');
const {pipeline} = require('node:stream/promises');
const {Readable, Writable} = require('node:stream');
const {createByteCapTransform} = require('./byte-cap-transform.js');

/**
 * @param {Buffer[]} chunks
 * @param {number} maxBytes
 * @param {(chunk: Buffer) => void} onChunk
 * @returns {Promise<Buffer>}
 */
async function pipeThrough(chunks, maxBytes, onChunk) {
  /** @type {Buffer[]} */
  const written = [];
  await pipeline(Readable.from(chunks), createByteCapTransform({maxBytes, onChunk}), new Writable({
    write(chunk, _encoding, callback) {
      written.push(chunk);
      callback();
    }
  }));
  return Buffer.concat(written);
}

describe('createByteCapTransform', () => {
  const onChunk = jest.fn(/** @type {(chunk: Buffer) => void} */ (() => undefined));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards every chunk unchanged while under the cap', async () => {
    const chunks = [Buffer.from('abc'), Buffer.from('def')];

    await expect(pipeThrough(chunks, 100, onChunk)).resolves.toEqual(Buffer.from('abcdef'));
  });

  it('hands each chunk that stays under the cap to onChunk, in order', async () => {
    const firstChunk = Buffer.from('abc');
    const secondChunk = Buffer.from('def');

    await pipeThrough([firstChunk, secondChunk], 100, onChunk);

    expect(onChunk.mock.calls).toEqual([[firstChunk], [secondChunk]]);
  });

  it('lets a stream landing exactly on the cap through', async () => {
    await expect(pipeThrough([Buffer.from('123456')], 6, onChunk)).resolves.toEqual(Buffer.from('123456'));
  });

  it('fails the pipeline once the cap is passed, without calling onChunk for the chunk that passed it', async () => {
    const firstChunk = Buffer.from('123456');
    const secondChunk = Buffer.from('7');

    await expect(pipeThrough([firstChunk, secondChunk], 6, onChunk)).rejects.toThrow('Download exceeded 6 bytes');
    expect(onChunk).toHaveBeenCalledTimes(1);
    expect(onChunk).toHaveBeenCalledWith(firstChunk);
  });
});
