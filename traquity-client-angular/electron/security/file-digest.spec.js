const {beforeEach, describe, expect, it, jest} = require('@jest/globals');
const crypto = require('node:crypto');
const {Readable} = require('node:stream');
const {digestOfFile} = require('./file-digest.js');

describe('digestOfFile', () => {
  const filePath = '/artifacts/model.gguf';
  const fileChunks = [Buffer.from('first chunk of the artifact'), Buffer.from('second chunk of the artifact')];
  const fileBytes = Buffer.concat(fileChunks);

  /** @type {jest.Mock<(filePath: string) => NodeJS.ReadableStream>} */
  let createReadStream;

  beforeEach(() => {
    createReadStream = jest.fn(() => Readable.from(fileChunks));
  });

  it('digests a file arriving in several chunks', async () => {
    const expected = crypto.createHash('sha256').update(fileBytes).digest('hex');

    await expect(digestOfFile(filePath, 'sha256', createReadStream)).resolves.toBe(expected);
  });

  it('streams the file it was given the path of', async () => {
    await digestOfFile(filePath, 'sha256', createReadStream);

    expect(createReadStream).toHaveBeenCalledWith(filePath);
    expect(createReadStream).toHaveBeenCalledTimes(1);
  });

  it('changes the digest when a single byte differs', async () => {
    const tampered = Buffer.from(fileBytes);
    tampered[0] = (tampered[0] ?? 0) ^ 0xff;
    createReadStream.mockReturnValue(Readable.from([tampered]));

    await expect(digestOfFile(filePath, 'sha256', createReadStream)).resolves.not
      .toBe(crypto.createHash('sha256').update(fileBytes).digest('hex'));
  });

  it('digests under the algorithm it was given rather than a fixed one', async () => {
    const expected = crypto.createHash('sha512').update(fileBytes).digest('hex');

    await expect(digestOfFile(filePath, 'sha512', createReadStream)).resolves.toBe(expected);
  });

  it('rejects rather than resolving when the file cannot be read', async () => {
    createReadStream.mockReturnValue(Readable.from((async function* () {
      throw new Error('ENOENT');
    })()));

    await expect(digestOfFile(filePath, 'sha256', createReadStream)).rejects.toThrow('ENOENT');
  });
});
