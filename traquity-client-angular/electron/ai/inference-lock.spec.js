const {beforeEach, describe, expect, it, jest} = require('@jest/globals');

const {createInferenceLock} = require('./inference-lock.js');

/** @import {InferenceRequest, RunInference} from './local-inference.js' */

const ANSWER = '{"transactionType":"SELL"}';

const ALREADY_RUNNING = 'Another AI request is still running.';

describe('createInferenceLock', () => {
  /** @type {jest.Mock<RunInference>} */
  let runInference;
  /** @type {jest.Mock<(message: string) => void>} */
  let log;
  /** @type {InferenceRequest} */
  let request;
  /** @type {InferenceRequest} */
  let otherRequest;
  /** @type {{run: RunInference}} */
  let subjectUnderTest;

  beforeEach(() => {
    runInference = jest.fn(async () => ANSWER);
    log = jest.fn();

    request = {
      modelPath: '/models/model-a.gguf',
      systemPrompt: 'the system prompt',
      userMessage: 'the message',
      grammar: 'root ::= "{}"'
    };
    otherRequest = {
      modelPath: '/models/model-a.gguf',
      systemPrompt: 'another system prompt',
      userMessage: 'another message'
    };

    subjectUnderTest = createInferenceLock({runInference, log});
  });

  it('answers with what the run answered', async () => {
    await expect(subjectUnderTest.run(request)).resolves.toBe(ANSWER);
  });

  it('hands the request over as it was given', async () => {
    await subjectUnderTest.run(request);

    expect(runInference).toHaveBeenCalledWith(request);
    expect(runInference).toHaveBeenCalledTimes(1);
  });

  it('rejects with what a failing run threw', async () => {
    runInference.mockRejectedValue(new Error('The model could not be loaded.'));

    await expect(subjectUnderTest.run(request)).rejects.toThrow('The model could not be loaded.');
  });

  it('takes the next request after one that failed', async () => {
    runInference.mockRejectedValueOnce(new Error('The model could not be loaded.'));
    await expect(subjectUnderTest.run(request)).rejects.toThrow('The model could not be loaded.');

    await expect(subjectUnderTest.run(otherRequest)).resolves.toBe(ANSWER);
  });

  describe('with one generation still running', () => {
    /** @type {(answer: string) => void} */
    let finishFirst;

    beforeEach(() => {
      runInference.mockReturnValue(new Promise(resolveRun => {
        finishFirst = resolveRun;
      }));
    });

    it('refuses a second one with that as the reason', async () => {
      /** @type {Promise<string>} */
      const first = subjectUnderTest.run(request);

      await expect(subjectUnderTest.run(otherRequest)).rejects.toThrow(ALREADY_RUNNING);

      finishFirst(ANSWER);
      await first;
    });

    it('runs the model once, the second request never reaching it', async () => {
      /** @type {Promise<string>} */
      const first = subjectUnderTest.run(request);
      await expect(subjectUnderTest.run(otherRequest)).rejects.toThrow(ALREADY_RUNNING);

      expect(runInference.mock.calls).toEqual([[request]]);

      finishFirst(ANSWER);
      await first;
    });

    it('takes the next request once it has finished', async () => {
      /** @type {Promise<string>} */
      const first = subjectUnderTest.run(request);
      finishFirst(ANSWER);
      await first;
      runInference.mockResolvedValueOnce(ANSWER);

      await expect(subjectUnderTest.run(otherRequest)).resolves.toBe(ANSWER);
    });
  });
});
