const {Transform} = require('node:stream');

/**
 * A stream `Transform` that counts the bytes passing through and ends the pipeline with an error once `maxBytes` is
 * passed, rather than letting the write side run on - which fails the pipeline it sits in. The cap is enforced on
 * the bytes actually written, not on a `content-length` header, which is a claim by the same sender. What a caller
 * does with a chunk that stays under the cap - hash it, count it, both - is `onChunk`'s business alone; this module
 * never looks inside a chunk.
 */

/**
 * @param {{maxBytes: number, onChunk: (chunk: Buffer) => void}} options
 * @returns {Transform}
 */
function createByteCapTransform(options) {
  const {maxBytes, onChunk} = options;
  let totalBytes = 0;

  return new Transform({
    transform(chunk, _encoding, callback) {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        callback(new Error(`Download exceeded ${maxBytes} bytes`));
        return;
      }
      onChunk(chunk);
      callback(null, chunk);
    }
  });
}

module.exports = {createByteCapTransform};
