const {beforeEach, describe, expect, it, jest} = require('@jest/globals');

jest.mock('./transaction-extraction.js', () => ({
  extractedAnswerSchema: {safeParse: jest.fn()},
  transactionOfAnswer: jest.fn(),
  grammarFor: jest.fn(),
  isinOf: jest.fn(),
  literalsOf: jest.fn(),
  messageFor: jest.fn()
}));

const {extractedAnswerSchema, grammarFor, isinOf, literalsOf, messageFor, transactionOfAnswer} =
  require('./transaction-extraction.js');
const {createTransactionExtractor} = require('./transaction-extractor.js');

/** @import {AiState} from '../ai-registry.js' */
/** @import {RunInference} from '../local-inference.js' */
/** @import {AiPromptResolution} from '../prompt-resolver.js' */
/** @import {TransactionExtractor} from './transaction-extractor.js' */

const MODEL_KEY = 'model-a';
const MODEL_PATH = '/models/model-a.gguf';
const DOCUMENT = 'Kurswert  |  1.700,00 EUR';
/**
 * What the schema hands back: one list per monetary field, as the model stated them.
 *
 * @type {import('./transaction-extraction.js').ExtractedAnswer}
 */
const ANSWERED_LINES = {
  transactionType: 'SELL',
  date: '2024-02-02',
  securityCountOriginal: 10,
  grossValue: [1700],
  tax: [24, 1.32],
  fee: [],
  netProceedings: [],
  taxableBase: []
};
/** What the lists reduce to, which is what a caller is given. */
const TRANSACTION = {transactionType: 'SELL', grossValue: 1700, tax: 25.32};
const CURRENCY = 'EUR';
const ANSWER = '{"transactionType":"SELL"}';
/** What the document itself names, which is where the security comes from. */
const ISIN = 'DE000MUSTR14';

/** @type {import('./transaction-extraction.js').DocumentLiterals} */
const LITERALS = {dates: ['2024-02-02'], times: [], numbers: ['1700.00']};

const GRAMMAR = 'root ::= "{}"';
const PROMPT_PATH = '/resources/prompts/transaction-extraction/default.md';

/**
 * As much of zod's own result as this spec's stub has to carry: a rejection's `error` is read for the log.
 *
 * @typedef {{success: true, data: unknown} | {success: false, error: {message: string}}} SafeParseResult
 */

describe('createTransactionExtractor', () => {
  /** @type {jest.Mock<(usecase: string, modelKey: string) => AiPromptResolution>} */
  let resolve;
  /** @type {jest.Mock<() => AiState>} */
  let getState;
  /** @type {jest.Mock<RunInference>} */
  let runInference;
  /** @type {jest.Mock<(value: unknown) => SafeParseResult>} */
  let safeParse;
  /** @type {jest.Mock<(message: string) => void>} */
  let log;
  /** @type {TransactionExtractor} */
  let subjectUnderTest;

  beforeEach(() => {
    resolve = jest.fn(() => ({
      status: 'resolved',
      prompt: 'the system prompt',
      layer: 'packaged-default',
      filePath: PROMPT_PATH
    }));
    getState = jest.fn(() => ({
      isConfirmed: true,
      catalogue: [],
      models: {[MODEL_KEY]: {path: MODEL_PATH, active: true}}
    }));
    runInference = jest.fn(async () => ANSWER);
    log = jest.fn();

    safeParse = /** @type {jest.Mock<(value: unknown) => SafeParseResult>} */
      (extractedAnswerSchema.safeParse);
    safeParse.mockReset();
    safeParse.mockReturnValue({success: true, data: ANSWERED_LINES});

    /** @type {jest.Mock<(answer: unknown, isin: string | undefined) => unknown>} */ (transactionOfAnswer).mockReset();
    /** @type {jest.Mock<(answer: unknown, isin: string | undefined) => unknown>} */ (transactionOfAnswer)
      .mockReturnValue(TRANSACTION);

    /** @type {jest.Mock<(text: string) => string | undefined>} */ (isinOf).mockReset();
    /** @type {jest.Mock<(text: string) => string | undefined>} */ (isinOf).mockReturnValue(ISIN);

    /** @type {jest.Mock<(text: string) => unknown>} */ (literalsOf).mockReset();
    /** @type {jest.Mock<(text: string) => unknown>} */ (literalsOf).mockReturnValue(LITERALS);
    /** @type {jest.Mock<(literals: unknown) => string>} */ (grammarFor).mockReset();
    /** @type {jest.Mock<(literals: unknown) => string>} */ (grammarFor).mockReturnValue(GRAMMAR);
    /** @type {jest.Mock<(text: string, currency: string) => string>} */ (messageFor).mockReset();
    /** @type {jest.Mock<(text: string, currency: string) => string>} */ (messageFor).mockReturnValue('the message');

    subjectUnderTest = createTransactionExtractor({
      promptResolver: {resolve},
      aiRegistry: {getState},
      runInference,
      log
    });
  });

  it('answers with the transaction the schema accepted', async () => {
    await expect(subjectUnderTest.extract(MODEL_KEY, DOCUMENT, CURRENCY))
      .resolves.toEqual({status: 'extracted', transaction: TRANSACTION});
  });

  it('runs the model on the resolved prompt, the built message and the document\'s own grammar', async () => {
    await subjectUnderTest.extract(MODEL_KEY, DOCUMENT, CURRENCY);

    expect(runInference).toHaveBeenCalledWith({
      modelPath: MODEL_PATH,
      systemPrompt: 'the system prompt',
      userMessage: 'the message',
      grammar: GRAMMAR
    });
    expect(runInference).toHaveBeenCalledTimes(1);
  });

  it('resolves the prompt for this usecase and the model it was asked for', async () => {
    await subjectUnderTest.extract(MODEL_KEY, DOCUMENT, CURRENCY);

    expect(resolve).toHaveBeenCalledWith('transaction-extraction', MODEL_KEY);
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('builds the message out of the document and the currency it was given', async () => {
    await subjectUnderTest.extract(MODEL_KEY, DOCUMENT, CURRENCY);

    expect(messageFor).toHaveBeenCalledWith(DOCUMENT, CURRENCY);
    expect(messageFor).toHaveBeenCalledTimes(1);
  });

  it('generates the grammar from the document\'s own literals', async () => {
    await subjectUnderTest.extract(MODEL_KEY, DOCUMENT, CURRENCY);

    expect(literalsOf).toHaveBeenCalledWith(DOCUMENT);
    expect(literalsOf).toHaveBeenCalledTimes(1);
    expect(grammarFor).toHaveBeenCalledWith(LITERALS);
    expect(grammarFor).toHaveBeenCalledTimes(1);
  });

  it('reads the security off the document and builds the transaction with it', async () => {
    await subjectUnderTest.extract(MODEL_KEY, DOCUMENT, CURRENCY);

    expect(isinOf).toHaveBeenCalledWith(DOCUMENT);
    expect(isinOf).toHaveBeenCalledTimes(1);
    expect(transactionOfAnswer).toHaveBeenCalledWith(ANSWERED_LINES, ISIN);
    expect(transactionOfAnswer).toHaveBeenCalledTimes(1);
  });

  it('builds the transaction without one where the document names no single security', async () => {
    /** @type {jest.Mock<(text: string) => string | undefined>} */ (isinOf).mockReturnValue(undefined);

    await subjectUnderTest.extract(MODEL_KEY, DOCUMENT, CURRENCY);

    expect(transactionOfAnswer).toHaveBeenCalledWith(ANSWERED_LINES, undefined);
    expect(transactionOfAnswer).toHaveBeenCalledTimes(1);
  });

  describe('refusals', () => {
    it('refuses a key no installed model carries, without running anything', async () => {
      getState.mockReturnValue({isConfirmed: true, catalogue: [], models: {}});

      await expect(subjectUnderTest.extract(MODEL_KEY, DOCUMENT, CURRENCY))
        .resolves.toEqual({status: 'failed', message: `The model ${MODEL_KEY} is not installed.`});
      expect(runInference).not.toHaveBeenCalled();
    });

    it('refuses a usecase no layer holds a prompt for, without running anything', async () => {
      resolve.mockReturnValue({status: 'missing', usecase: 'transaction-extraction'});

      await expect(subjectUnderTest.extract(MODEL_KEY, DOCUMENT, CURRENCY))
        .resolves.toEqual({status: 'failed', message: 'No system prompt was found for transaction-extraction.'});
      expect(runInference).not.toHaveBeenCalled();
    });

    it('reports what a failing run said', async () => {
      runInference.mockRejectedValue(new Error('The model could not be loaded.'));

      await expect(subjectUnderTest.extract(MODEL_KEY, DOCUMENT, CURRENCY))
        .resolves.toEqual({status: 'failed', message: 'The model could not be loaded.'});
    });

    it('refuses an answer that is not JSON', async () => {
      runInference.mockResolvedValue('I could not read that document.');

      await expect(subjectUnderTest.extract(MODEL_KEY, DOCUMENT, CURRENCY))
        .resolves.toEqual({status: 'failed', message: 'The model did not answer with a transaction.'});
    });

    it('refuses an answer the schema rejects', async () => {
      safeParse.mockReturnValue({success: false, error: {message: 'grossValue: expected number'}});

      await expect(subjectUnderTest.extract(MODEL_KEY, DOCUMENT, CURRENCY))
        .resolves.toEqual({status: 'failed', message: 'The model did not answer with a transaction.'});
    });
  });
});
