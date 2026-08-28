/**
 * How large a context one generation needs, in tokens, whether the model can hold it, and how to make room for it
 * on a card that could not.
 *
 * A context holds the prompt and the answer at once. Sized by the free VRAM alone it can come out below the prompt,
 * which fails the generation before a token is produced. Sized just above it, the context shifts: the oldest tokens
 * are dropped, so the top of the prompt leaves the window and the model answers from input it no longer has, with
 * nothing in the answer showing that it did.
 *
 * A context larger than the model was trained on is refused here: llama.cpp allocates it, and the model then
 * attends over positions it has never seen.
 */

/**
 * What a chat template adds around the prompt: role markers, the tokens opening and closing each turn, the
 * assistant prefix a thinking model forces open. Small, and specific to a template this module does not see, so it
 * is a margin and no calculation.
 *
 *  @type {number}
 */
const TEMPLATE_MARGIN_TOKENS = 256;

/**
 * @typedef {Object} ContextSizeInput
 * @property {number} promptTokens what the system prompt and the user message tokenize to, together
 * @property {number} answerTokens the most the generation is allowed to produce
 */

/**
 * @param {ContextSizeInput} input
 * @returns {number}
 */
function contextSizeFor(input) {
  return input.promptTokens + input.answerTokens + TEMPLATE_MARGIN_TOKENS;
}

/**
 * @param {number} contextSize
 * @param {number} trainedContextSize
 * @returns {boolean} whether the model would be made to attend over positions it was never trained on
 */
function exceedsTrainedContext(contextSize, trainedContextSize) {
  return contextSize > trainedContextSize;
}

/**
 * The layer counts to fall back through when the context did not fit the VRAM beside the layers already on the
 * card, in the order they are tried.
 *
 * The starting point is what the library itself put there: its estimate of how much room a context needs is what
 * came out short, so asking it again answers the same. Steps of a fifth reach a working placement in one or two
 * loads and still keep most of the model on the GPU. The last step is nothing on the GPU, the one placement whose
 * context cannot run out of VRAM.
 *
 * Repeated steps and steps that are no reduction are dropped, so a model already entirely on the CPU yields no
 * attempts.
 *
 * @type {number[]}
 */
const LADDER_FRACTIONS = [0.8, 0.6, 0.4, 0.2, 0];

/**
 * @param {number} initialLayers what the library put on the GPU for the attempt that failed
 * @returns {number[]} the layer counts to try next, in order; empty where there is no reduction left to make
 */
function gpuLayerLadder(initialLayers) {
  const steps = LADDER_FRACTIONS.map(fraction => Math.floor(initialLayers * fraction));

  return [...new Set(steps)].filter(layers => layers < initialLayers);
}

module.exports = {contextSizeFor, exceedsTrainedContext, gpuLayerLadder, TEMPLATE_MARGIN_TOKENS};
