/**
 * The text of a generation, taken from every part of it.
 *
 * A chat wrapper splits what a model produced into parts, and the plain response text it offers alongside them
 * concatenates only the plain-string ones - a thought segment is something a caller usually wants to read past.
 * Under a grammar there is nothing to read past: every token the model was allowed to emit belongs to the answer.
 * A wrapper that force-opens a thought segment before the first token therefore puts the whole answer into a
 * segment, and the plain response text is empty.
 *
 * The parts are joined in the order they were generated, which is the order the grammar constrained them in.
 */

/**
 * One part of what a generation produced, as the library models it. The types are reached through an `import(...)`
 * type because the package is ESM-only and this file is CommonJS; nothing of it is loaded at runtime.
 *
 * @typedef {string | import('node-llama-cpp', {with: {'resolution-mode': 'import'}}).ChatModelFunctionCall
 *   | import('node-llama-cpp', {with: {'resolution-mode': 'import'}}).ChatModelSegment} ResponsePart
 */

/**
 * @param {ResponsePart} part
 * @returns {string} what the part contributed to the generation; a function call contributes nothing, since it is
 *   a structure and not text
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
