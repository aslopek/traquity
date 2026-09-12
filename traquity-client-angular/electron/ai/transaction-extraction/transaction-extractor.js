const {extractedAnswerSchema, grammarFor, messageFor, transactionOfAnswer} =
  require('./transaction-extraction.js');

/** @import {AiRegistry} from '../ai-registry.js' */
/** @import {RunInference} from '../local-inference.js' */
/** @import {AiPromptResolution, PromptResolver} from '../prompt-resolver.js' */
/** @import {ExtractedTransaction} from './transaction-extraction.js' */
/** @import {DocumentLiterals} from '../../ipc/ipc-schema.js' */

/**
 * One transaction out of one document: the model named by a catalogue key, decoding under a grammar generated for
 * that document, and its answer read back through the zod schema.
 *
 * A request runs to an outcome; there is no cancellation. A request may be denied, e.g. when another AI request is already in progress.
 */

/** The usecase this module serves, and the directory its packaged prompts live in. */
const USECASE = 'transaction-extraction';

/** Prefixes every entry this module writes, so a run reads as one thread in a log several processes share. */
const LOG_PREFIX = '[transaction-extraction]';

/** What a caller is told for an answer that reached no transaction, whichever of the two ways it failed to. */
const NOT_A_TRANSACTION = 'The model did not answer with a transaction.';

/**
 * What an extraction answers with. `failed` carries a message a screen can show.
 *
 * @typedef {{status: 'extracted', transaction: ExtractedTransaction} | {status: 'failed', message: string}} TransactionExtractionOutcome
 */

/**
 * @typedef {Object} TransactionExtractorOptions
 * @property {Pick<PromptResolver, 'resolve'>} promptResolver
 * @property {Pick<AiRegistry, 'getState'>} aiRegistry
 * @property {RunInference} runInference
 * @property {(message: string) => void} log
 */

/**
 * @typedef {Object} TransactionExtractor
 * @property {(modelKey: string, documentText: string, literals: DocumentLiterals, currency: string) =>
 *   Promise<TransactionExtractionOutcome>} extract
 */

/**
 * @param {TransactionExtractorOptions} options
 * @returns {TransactionExtractor}
 */
function createTransactionExtractor(options) {
  const {promptResolver, aiRegistry, runInference, log} = options;

  /**
   * @param {string} modelKey
   * @param {string} documentText
   * @param {DocumentLiterals} literals what the document states, read by the tier that parsed the page
   * @param {string} currency
   * @returns {Promise<TransactionExtractionOutcome>}
   */
  async function extract(modelKey, documentText, literals, currency) {
    log(`${LOG_PREFIX} requested with ${modelKey}, amounts to be read in ${currency}`);

    /** @type {string | undefined} */
    const modelPath = aiRegistry.getState().models[modelKey]?.path;
    if (modelPath == null) {
      log(`${LOG_PREFIX} refused: no installed model is recorded under ${modelKey}`);
      return {status: 'failed', message: `The model ${modelKey} is not installed.`};
    }

    /** @type {AiPromptResolution} */
    const resolution = promptResolver.resolve(USECASE, modelKey);
    if (resolution.status === 'missing') {
      log(`${LOG_PREFIX} refused: no layer holds a system prompt for ${resolution.usecase}`);
      return {status: 'failed', message: `No system prompt was found for ${resolution.usecase}.`};
    }

    /** @type {string} */
    const grammar = grammarFor(literals);
    log(`${LOG_PREFIX} system prompt from the ${resolution.layer} layer (${resolution.filePath})`);
    log(`${LOG_PREFIX} document text, ${documentText.length} characters:\n${documentText}\n`);
    log(`${LOG_PREFIX} grammar:\n${grammar}\n`);

    try {
      /** @type {string} */
      const answer = await runInference({
        modelPath,
        systemPrompt: resolution.prompt,
        userMessage: messageFor(documentText, currency),
        grammar
      });
      log(`${LOG_PREFIX} answer:\n${answer}\n`);
      return parsedOutcome(answer);
    } catch (error) {
      /** @type {string} */
      const message = error instanceof Error ? error.message : String(error);
      log(`${LOG_PREFIX} the run failed: ${message}`);
      return {status: 'failed', message};
    }
  }

  /**
   * The answer arrives from another process, so it is parsed and never trusted. The grammar constrains its shape
   * and the schema decides whether that shape carries a transaction this app can use.
   *
   * @param {string} answer
   * @returns {TransactionExtractionOutcome}
   */
  function parsedOutcome(answer) {
    /** @type {unknown} */
    let parsedJson;
    try {
      parsedJson = JSON.parse(answer);
    } catch (error) {
      log(`${LOG_PREFIX} the answer is not JSON: ${error instanceof Error ? error.message : String(error)}`);
      return {status: 'failed', message: NOT_A_TRANSACTION};
    }

    const parsed = extractedAnswerSchema.safeParse(parsedJson);
    if (!parsed.success) {
      log(`${LOG_PREFIX} the answer is JSON, but no transaction:\n${parsed.error.message}`);
      return {status: 'failed', message: NOT_A_TRANSACTION};
    }

    /** @type {ExtractedTransaction} */
    const transaction = transactionOfAnswer(parsed.data);
    // the lines beside their sum, so a wrong amount is read as the wrong line picked and not as ba
    log(`${LOG_PREFIX} grossValue ${JSON.stringify(parsed.data.grossValue)} -> ${transaction.grossValue}, `
      + `tax ${JSON.stringify(parsed.data.tax)} -> ${transaction.tax}, `
      + `fee ${JSON.stringify(parsed.data.fee)} -> ${transaction.fee}`);
    log(`${LOG_PREFIX} netProceedings ${JSON.stringify(parsed.data.netProceedings)}, `
      + `taxableBase ${JSON.stringify(parsed.data.taxableBase)}`);
    return {status: 'extracted', transaction};
  }

  return {extract};
}

module.exports = {createTransactionExtractor, USECASE};
