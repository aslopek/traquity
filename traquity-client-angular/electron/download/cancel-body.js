/**
 * Cancels a `fetch` response body that a caller has decided not to read, releasing the connection it would otherwise
 * hold open until garbage collection reclaims it. Safe to call with a `null` body (an `ok: false` response without
 * body, e.g.) and safe if the cancellation itself rejects - either way this is best-effort cleanup on a path that has
 * already failed for a reason diagnosed elsewhere, and that diagnosed reason stays the outcome.
 */

/**
 * @param {ReadableStream<Uint8Array> | null} body
 * @returns {Promise<void>}
 */
async function cancelBody(body) {
  if (body == null) {
    return;
  }
  try {
    await body.cancel();
  } catch {
    // deliberately swallowed
  }
}

module.exports = {cancelBody};
