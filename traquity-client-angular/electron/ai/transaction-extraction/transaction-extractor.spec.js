const {beforeEach, describe, expect, it, jest} = require('@jest/globals');

jest.mock('./transaction-extraction.js', () => ({
  extractedAnswerSchema: {safeParse: jest.fn()},
  transactionOfAnswer: jest.fn(),
  grammarFor: jest.fn(),
  messageFor: jest.fn()
}));

const {extractedAnswerSchema, grammarFor, messageFor, transactionOfAnswer} =
  require('./transaction-extraction.js');
const {createTransactionExtractor} = require('./transaction-extractor.js');

/** @import {AiState} from '../ai-registry.js' */
/** @import {RunInference} from '../local-inference.js' */
/** @import {AiPromptResolution} from '../prompt-resolver.js' */
/** @import {TransactionExtractor} from './transaction-extractor.js' */

const MODEL_KEY = 'model-a';
const MODEL_PATH = '/models/model-a.gguf';
const OTHER_MODEL_KEY = 'model-b';
const OTHER_MODEL_PATH = '/models/model-b.gguf';
const DOCUMENT = 'Kurswert  |  1.700,00 EUR';
const CURRENCY = 'EUR';
const ANSWER = '{"transactionType":"SELL"}';

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
  /** @type {jest.MockedFunction<typeof transactionOfAnswer>} */
  let transactionOfAnswerMock;
  /** @type {jest.MockedFunction<typeof grammarFor>} */
  let grammarForMock;
  /** @type {jest.MockedFunction<typeof messageFor>} */
  let messageForMock;
  /** @type {jest.Mock<(message: string) => void>} */
  let log;
  /**
   * What the schema hands back: one list per monetary field, as the model stated them.
   *
   * @type {import('./transaction-extraction.js').ExtractedAnswer}
   */
  let answeredLines;
  /**
   * What the lists reduce to, which is what a caller is given.
   *
   * @type {import('./transaction-extraction.js').ExtractedTransaction}
   */
  let transaction;
  /** @type {import('../../ipc/ipc-schema.js').DocumentLiterals} */
  let literals;
  /** @type {TransactionExtractor} */
  let subjectUnderTest;

  beforeEach(() => {
    answeredLines = {
      transactionType: 'SELL',
      date: '2024-02-02',
      securityCountOriginal: 10,
      grossValue: [1700],
      tax: [24, 1.32],
      fee: [],
      netProceedings: [],
      taxableBase: []
    };
    transaction = {
      transactionType: 'SELL',
      date: '2024-02-02',
      securityCountOriginal: 10,
      grossValue: 1700,
      tax: 25.32
    };
    literals = {dates: ['2024-02-02'], times: [], numbers: ['1700.00']};

    resolve = jest.fn(() => ({
      status: 'resolved',
      prompt: 'the system prompt',
      layer: 'packaged-default',
      filePath: PROMPT_PATH
    }));
    getState = jest.fn(() => ({
      isConfirmed: true,
      catalogue: [],
      models: {
        [OTHER_MODEL_KEY]: {path: OTHER_MODEL_PATH, active: true},
        [MODEL_KEY]: {path: MODEL_PATH, active: false}
      }
    }));
    runInference = jest.fn(async () => ANSWER);
    log = jest.fn();

    safeParse = /** @type {jest.Mock<(value: unknown) => SafeParseResult>} */
      (extractedAnswerSchema.safeParse);
    safeParse.mockReset();
    safeParse.mockReturnValue({success: true, data: answeredLines});

    transactionOfAnswerMock = jest.mocked(transactionOfAnswer);
    transactionOfAnswerMock.mockReset();
    transactionOfAnswerMock.mockReturnValue(transaction);

    grammarForMock = jest.mocked(grammarFor);
    grammarForMock.mockReset();
    grammarForMock.mockReturnValue(GRAMMAR);

    messageForMock = jest.mocked(messageFor);
    messageForMock.mockReset();
    messageForMock.mockReturnValue('the message');

    subjectUnderTest = createTransactionExtractor({
      promptResolver: {resolve},
      aiRegistry: {getState},
      runInference,
      log
    });
  });

  it('answers with the transaction the schema accepted', async () => {
    await expect(subjectUnderTest.extract(MODEL_KEY, DOCUMENT, literals, CURRENCY))
      .resolves.toEqual({status: 'extracted', transaction});
  });

  it('runs the model on the resolved prompt, the built message and the document\'s own grammar', async () => {
    await subjectUnderTest.extract(MODEL_KEY, DOCUMENT, literals, CURRENCY);

    expect(runInference).toHaveBeenCalledWith({
      modelPath: MODEL_PATH,
      systemPrompt: 'the system prompt',
      userMessage: 'the message',
      grammar: GRAMMAR
    });
    expect(runInference).toHaveBeenCalledTimes(1);
  });

  it('resolves the prompt for this usecase and the model it was asked for', async () => {
    await subjectUnderTest.extract(MODEL_KEY, DOCUMENT, literals, CURRENCY);

    expect(resolve).toHaveBeenCalledWith('transaction-extraction', MODEL_KEY);
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('builds the message out of the document and the currency it was given', async () => {
    await subjectUnderTest.extract(MODEL_KEY, DOCUMENT, literals, CURRENCY);

    expect(messageForMock).toHaveBeenCalledWith(DOCUMENT, CURRENCY);
    expect(messageForMock).toHaveBeenCalledTimes(1);
  });

  it('generates the grammar from the literals the request carries', async () => {
    await subjectUnderTest.extract(MODEL_KEY, DOCUMENT, literals, CURRENCY);

    expect(grammarForMock).toHaveBeenCalledWith(literals);
    expect(grammarForMock).toHaveBeenCalledTimes(1);
  });

  it('builds the transaction out of the lines the schema accepted', async () => {
    await subjectUnderTest.extract(MODEL_KEY, DOCUMENT, literals, CURRENCY);

    expect(transactionOfAnswerMock).toHaveBeenCalledWith(answeredLines);
    expect(transactionOfAnswerMock).toHaveBeenCalledTimes(1);
  });

  describe('refusals', () => {
    it('refuses a key no installed model carries, without running anything', async () => {
      getState.mockReturnValue({
        isConfirmed: true,
        catalogue: [],
        models: {[OTHER_MODEL_KEY]: {path: OTHER_MODEL_PATH, active: true}}
      });

      await expect(subjectUnderTest.extract(MODEL_KEY, DOCUMENT, literals, CURRENCY))
        .resolves.toEqual({status: 'failed', message: `The model ${MODEL_KEY} is not installed.`});
      expect(runInference).not.toHaveBeenCalled();
    });

    it('refuses a usecase no layer holds a prompt for, without running anything', async () => {
      resolve.mockReturnValue({status: 'missing', usecase: 'transaction-extraction'});

      await expect(subjectUnderTest.extract(MODEL_KEY, DOCUMENT, literals, CURRENCY))
        .resolves.toEqual({status: 'failed', message: 'No system prompt was found for transaction-extraction.'});
      expect(runInference).not.toHaveBeenCalled();
    });

    it('reports what a failing run said', async () => {
      runInference.mockRejectedValue(new Error('The model could not be loaded.'));

      await expect(subjectUnderTest.extract(MODEL_KEY, DOCUMENT, literals, CURRENCY))
        .resolves.toEqual({status: 'failed', message: 'The model could not be loaded.'});
    });

    it('refuses an answer that is not JSON', async () => {
      runInference.mockResolvedValue('I could not read that document.');

      await expect(subjectUnderTest.extract(MODEL_KEY, DOCUMENT, literals, CURRENCY))
        .resolves.toEqual({status: 'failed', message: 'The model did not answer with a transaction.'});
    });

    it('refuses an answer the schema rejects', async () => {
      safeParse.mockReturnValue({success: false, error: {message: 'grossValue: expected number'}});

      await expect(subjectUnderTest.extract(MODEL_KEY, DOCUMENT, literals, CURRENCY))
        .resolves.toEqual({status: 'failed', message: 'The model did not answer with a transaction.'});
    });
  });
});
