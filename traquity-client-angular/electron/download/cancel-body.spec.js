const {describe, expect, it, jest} = require('@jest/globals');
const {cancelBody} = require('./cancel-body.js');

describe('cancelBody', () => {
  it('cancels a present body', async () => {
    const cancel = jest.fn(() => Promise.resolve());
    const body = /** @type {ReadableStream<Uint8Array>} */ (/** @type {unknown} */ ({cancel}));

    await cancelBody(body);

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith();
  });

  it('does nothing for a null body', async () => {
    await expect(cancelBody(null)).resolves.toBeUndefined();
  });

  it('swallows a rejection from cancel', async () => {
    const cancel = jest.fn(() => Promise.reject(new Error('unexpected error')));
    const body = /** @type {ReadableStream<Uint8Array>} */ (/** @type {unknown} */ ({cancel}));

    await expect(cancelBody(body)).resolves.toBeUndefined();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith();
  });
});
