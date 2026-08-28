const {contextSizeFor, exceedsTrainedContext, gpuLayerLadder} = require('./context-size.js');
const {textOfResponse} = require('./response-text.js');

/**
 * Runs one inference and resolves with what the model answered.
 *
 * It runs in the process it is called from, and the weights are released by disposing the model and the context
 * when the answer is in, never by a process ending. Two things follow that are this module's own to uphold: the
 * `finally` blocks around the generation are what returns gigabytes to the machine, and a failure inside the native
 * binding is not contained by anything here.
 *
 * The library does its evaluation off the JavaScript thread, so a generation does not occupy the loop of whoever
 * calls it.
 */

/** @typedef {import('node-llama-cpp', {with: {'resolution-mode': 'import'}}).Llama} Llama */

/** @typedef {import('node-llama-cpp', {with: {'resolution-mode': 'import'}}).LlamaModel} LlamaModel */

/** @typedef {import('node-llama-cpp', {with: {'resolution-mode': 'import'}}).LlamaContext} LlamaContext */

/** @typedef {import('node-llama-cpp', {with: {'resolution-mode': 'import'}}).LlamaChatSession} LlamaChatSession */

/** @typedef {import('node-llama-cpp', {with: {'resolution-mode': 'import'}}).LlamaGrammar} LlamaGrammar */

/** @typedef {Awaited<ReturnType<Llama['loadModel']>>} LoadedModel */

/** @typedef {Awaited<ReturnType<LoadedModel['createContext']>>} LoadedContext */

/**
 * What one invocation of the model needs, fully resolved: a usecase, a prompt layer and a catalogue key are all
 * decided before a request exists, so nothing below this type knows of any of them.
 *
 * @typedef {Object} InferenceRequest
 * @property {string} modelPath
 * @property {string} systemPrompt
 * @property {string} userMessage
 * @property {string} [grammar] GBNF; absent for a request whose answer is not constrained to a shape
 */

/** @typedef {(request: InferenceRequest) => Promise<string>} RunInference */

/**
 * @typedef {Object} LocalInferenceOptions
 * @property {() => Promise<Llama>} resolveLlama
 * @property {(error: unknown) => Promise<boolean>} isOutOfMemory whether a failure was memory refusing an
 *   allocation, which is the one failure a different placement of the model can still answer
 * @property {(message: string) => void} log where a run is recorded while it happens
 */

/**
 * Holds the model's thinking and its answer both, so a spiral truncates instead of returning nothing.
 * @type {number}
 */
const MAXIMUM_TOKENS = 2048;

/**
 * Greedy decoding loops; a small temperature with a repeat penalty is what a shipped generation uses.
 * @type {number}
 */
const TEMPERATURE = 0.2;

/**
 * Prefixes every entry this module writes, so a run reads as one thread in a log several sources share.
 * @type {string}
 */
const LOG_PREFIX = '[inference]';

/**
 * @param {LocalInferenceOptions} options
 * @returns {{run: RunInference}}
 */
function createLocalInference(options) {
  const {resolveLlama, isOutOfMemory, log} = options;

  /**
   * How many tokens the prompt comes to, measured before the weights are loaded.
   *
   * The count decides how much of the model may go to the GPU, so it has to be known before the model is loaded,
   * and only the model's own tokenizer can produce it. A vocabulary-only load is what resolves that: it reads the
   * tokenizer out of the same file without any weight tensor, in a fraction of the time and the memory a real load
   * takes.
   *
   * @param {Llama} llama
   * @param {InferenceRequest} request
   * @returns {Promise<number>}
   */
  async function promptTokensOf(llama, request) {
    /** @type {LlamaModel} */
    const vocabulary = await llama.loadModel({modelPath: request.modelPath, vocabOnly: true});
    try {
      return vocabulary.tokenize(request.systemPrompt).length + vocabulary.tokenize(request.userMessage).length;
    } finally {
      await vocabulary.dispose();
    }
  }

  /**
   * The model and a context of exactly the size asked for, placed wherever it fits.
   *
   * The context size is what the prompt dictates and is pinned to it: one that merely almost fits shifts the top
   * of the prompt back out of the window and the model answers confidently from what is left. What gives instead
   * is how much of the model sits on the GPU, so a placement whose context the memory refuses is dropped for the
   * next one and the model is loaded again. Only a memory failure is retried; anything else is re-thrown.
   *
   * @param {Llama} llama
   * @param {string} modelPath
   * @param {number} contextSize
   * @returns {Promise<{model: LoadedModel, context: LoadedContext}>} both have to be disposed by the caller
   */
  async function loadForContext(llama, modelPath, contextSize) {
    /** @type {{fitContext: {contextSize: number}} | number} the library's own placement, until it comes out short */
    let placement = {fitContext: {contextSize}};
    /** @type {number[]} the reductions left to try, known only once the library has placed the model once */
    let ladder = [];
    /** @type {boolean} */
    let placedOnce = false;

    while (true) {
      log(`${LOG_PREFIX} loading the model at ${modelPath}, placed as ${JSON.stringify(placement)}`);
      /** @type {LlamaModel} */
      const model = await llama.loadModel({modelPath, gpuLayers: placement});
      /** @type {number} */
      const gpuLayers = model.gpuLayers;

      if (exceedsTrainedContext(contextSize, model.trainContextSize)) {
        /** @type {number} */
        const trained = model.trainContextSize;
        await model.dispose();
        throw new Error(`This request needs a context of ${contextSize} tokens and the model can hold ` +
          `${trained}. A model with a larger context can answer it.`);
      }
      log(`${LOG_PREFIX} ${gpuLayers} of the model's layers are on the GPU`);

      try {
        /** @type {LlamaContext} */
        const context = await model.createContext({contextSize: {min: contextSize, max: contextSize}});
        return {model, context};
      } catch (error) {
        await model.dispose();
        if (!await isOutOfMemory(error)) {
          throw error;
        }
        if (!placedOnce) {
          ladder = gpuLayerLadder(gpuLayers);
          placedOnce = true;
        }
        /** @type {number | undefined} */
        const fewer = ladder.shift();
        if (fewer == null) {
          throw error;
        }
        log(`${LOG_PREFIX} a context of ${contextSize} tokens did not fit beside ${gpuLayers} layers; ` +
          `loading again with ${fewer} layers`);
        placement = fewer;
      }
    }
  }

  /**
   * @param {InferenceRequest} request
   * @returns {Promise<string>} the model's answer, constrained by the request's grammar where it carries one
   */
  async function run(request) {
    /** @type {Llama} */
    const llama = await resolveLlama();
    /** @type {number} */
    const promptTokens = await promptTokensOf(llama, request);
    /** @type {number} */
    const contextSize = contextSizeFor({promptTokens, answerTokens: MAXIMUM_TOKENS});
    log(`${LOG_PREFIX} the prompt is ${promptTokens} tokens, so the context is sized to ${contextSize}`);

    const {model, context} = await loadForContext(llama, request.modelPath, contextSize);
    try {
      try {
        log(`${LOG_PREFIX} the context holds ${context.contextSize} tokens`);
        /** @type {LlamaChatSession} */
        const session = new llama.classes.LlamaChatSession({
          contextSequence: context.getSequence(),
          systemPrompt: request.systemPrompt
        });
        log(request.grammar == null
          ? `${LOG_PREFIX} generating unconstrained`
          : `${LOG_PREFIX} generating under ${request.grammar.split('\n').length} grammar rules`);
        /** @type {{grammar: LlamaGrammar} | {}} the key is left out entirely where a request constrains nothing */
        const constraint = request.grammar == null ? {} : {grammar: await llama.createGrammar({grammar: request.grammar})};
        const {response, stopReason} = await session.promptWithMeta(request.userMessage, {
          ...constraint,
          maxTokens: MAXIMUM_TOKENS,
          temperature: TEMPERATURE
        });
        /** @type {string} */
        const answer = textOfResponse(response);
        log(`${LOG_PREFIX} the generation ended on ${stopReason}, ${answer.length} characters long`);
        return answer;
      } finally {
        await context.dispose();
      }
    } finally {
      await model.dispose();
    }
  }

  return {run};
}

module.exports = {createLocalInference};
