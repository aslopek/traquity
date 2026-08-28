/**
 * The text of a generation, taken from every part of it.
 *
 * A chat wrapper splits what a model produced into parts, and the plain response text it offers concatenates only
 * the plain-string ones, since a thought segment is usually something to read past. Under a grammar there is
 * nothing to read past: every token belongs to the answer. A wrapper that force-opens a thought segment before the
 * first token therefore puts the whole answer into a segment and leaves the plain response text empty.
 */

/**
 * One part of a generation, as the library models it. The types come through an `import(...)` type because the
 * package is ESM-only and this file is CommonJS; nothing of it is loaded at runtime.
 *
 * @typedef {string | import('node-llama-cpp', {with: {'resolution-mode': 'import'}}).ChatModelFunctionCall
 *   | import('node-llama-cpp', {with: {'resolution-mode': 'import'}}).ChatModelSegment} ResponsePart
 */

/**
 * @param {ResponsePart} part
 * @returns {string} what the part contributed; a function call contributes nothing, being a structure and no text
 */
function textOfPart(part) {
  if (typeof part === 'string') {
    return part;
  }
  return part.type === 'segment' ? part.text : '';
}

/**
 * @param {readonly ResponsePart[]} response
 * @returns {string}
 */
function textOfResponse(response) {
  return response.map(textOfPart).join('');
}

module.exports = {textOfResponse};
