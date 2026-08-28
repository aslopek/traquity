/** @import {InferenceRequest, RunInference} from './local-inference.js' */

/**
 * One generation at a time, whatever asked for it.
 *
 * A request arriving while one is running is refused, and never queued: a generation holds a model and a context
 * for seconds to minutes, so a queue turns a refusal a caller can act on into an indefinite wait. A request runs to
 * an outcome; there is no cancellation.
 *
 * The refusal is a rejection carrying a message a screen can show as it is, so it needs no handling of its own: it
 * arrives wherever a failing run already arrives.
 *
 * This is a lock over the run, not over any kind of request - the machine holds the weights of one model at a
 * time, so what a refused request was going to ask the model is of no importance.
 */

/** Prefixes every entry this module writes, so a refusal reads as one thread in a log several sources share. */
const LOG_PREFIX = '[inference-lock]';

/** What a caller is told for a request that arrived while another one was still running. */
const ALREADY_RUNNING = 'Another AI request is still running.';

/**
 * @typedef {Object} InferenceLockOptions
 * @property {RunInference} runInference
 * @property {(message: string) => void} log where a refusal is recorded as it happens
 */

/**
 * @param {InferenceLockOptions} options
 * @returns {{run: RunInference}} the run it was given, refusing every request made while one of them is in flight
 */
function createInferenceLock(options) {
  const {runInference, log} = options;

  /** @type {boolean} whether a generation is in flight, decided and set before this function first awaits */
  let running = false;

  /**
   * @param {InferenceRequest} request
   * @returns {Promise<string>} what the run answered
   * @throws {Error} with `Another AI request is still running.` as its message, where one already is
   */
  async function run(request) {
    if (running) {
      log(`${LOG_PREFIX} refused: a generation is already running`);
      throw new Error(ALREADY_RUNNING);
    }

    running = true;
    try {
      return await runInference(request);
    } finally {
      running = false;
    }
  }

  return {run};
}

module.exports = {createInferenceLock};
