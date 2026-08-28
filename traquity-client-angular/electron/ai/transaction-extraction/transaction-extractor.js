const {extractedAnswerSchema, grammarFor, isinOf, literalsOf, messageFor, transactionOfAnswer} =
  require('./transaction-extraction.js');

/** @import {AiRegistry} from '../ai-registry.js' */
/** @import {RunInference} from '../local-inference.js' */
/** @import {AiPromptResolution, PromptResolver} from '../prompt-resolver.js' */
/** @import {ExtractedTransaction} from './transaction-extraction.js' */

/**
 * One transaction out of one document: the model named by a catalogue key, decoding under a grammar generated for
 * that document, its answer read back through the usecase's schema, and the security read off the document itself
 * instead of being asked of the model.
 *
 * A request runs to an outcome; there is no cancellation, and a run refusing one - because a generation is already
 * going, say - reaches a caller as a failed extraction like any other failing run.
 *
 * The model is located by key, through the registry's own read - which verifies a file exists at the recorded path
 * and deliberately looks no further. That existence check is the whole validation this performs: hashing gigabytes per request prolongs the
 * wait for the response too much.
 *
 * Every input a run was made on and every reason one was refused is written to the log as it happens. A refusal
 * reaches a screen as one sentence a user can act on, which is a sentence too short to say which of the document,
 * the grammar or the answer was the problem - so the log is where that is said instead.
 */

/** The usecase this module serves, and the directory its packaged prompts live in. */
const USECASE = 'transaction-extraction';

/** Prefixes every entry this module writes, so a run reads as one thread in a log several processes share. */
const LOG_PREFIX = '[transaction-extraction]';

/** What a caller is told for an answer that reached no transaction, whichever of the two ways it failed to. */
const NOT_A_TRANSACTION = 'The model did not answer with a transaction.';

/**
 * What an extraction answers with. `failed` carries a message a screen can show as it is.
 *
 * @typedef {{status: 'extracted', transaction: ExtractedTransaction} | {status: 'failed', message: string}} TransactionExtractionOutcome
 */

/**
 * @typedef {Object} TransactionExtractorOptions
 * @property {Pick<PromptResolver, 'resolve'>} promptResolver
 * @property {Pick<AiRegistry, 'getState'>} aiRegistry
 * @property {RunInference} runInference
 * @property {(message: string) => void} log where a run is recorded while it happens
 */

/**
 * @typedef {Object} TransactionExtractor
 * @property {(modelKey: string, documentText: string, currency: string) =>
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
   * @param {string} currency
   * @returns {Promise<TransactionExtractionOutcome>}
   */
  async function extract(modelKey, documentText, currency) {
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
    const grammar = grammarFor(literalsOf(documentText));
    /** @type {string | undefined} */
    const isin = isinOf(documentText);
    log(`${LOG_PREFIX} system prompt from the ${resolution.layer} layer (${resolution.filePath})`);
    log(`${LOG_PREFIX} document text, ${documentText.length} characters:\n${documentText}\n`);
    log(`${LOG_PREFIX} grammar:\n${grammar}\n`);
    log(`${LOG_PREFIX} isin read off the document: ${isin ?? 'none the document names on its own'}`);

    try {
      /** @type {string} */
      const answer = await runInference({
        modelPath,
        systemPrompt: resolution.prompt,
        userMessage: messageFor(documentText, currency),
        grammar
      });
      log(`${LOG_PREFIX} answer:\n${answer}\n`);
      return parsedOutcome(answer, isin);
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
   * @param {string | undefined} isin the security the document names, absent where it names no single one
   * @returns {TransactionExtractionOutcome}
   */
  function parsedOutcome(answer, isin) {
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
    const transaction = transactionOfAnswer(parsed.data, isin);
    // the lines beside their sum, so a wrong amount is read as the wrong line picked and not as bad arithmetic,
    // and the two figures the reconciliation runs on beside what it made of them
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
