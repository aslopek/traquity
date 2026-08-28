const {beforeEach, describe, expect, it} = require('@jest/globals');
const {contextSizeFor, exceedsTrainedContext, gpuLayerLadder, TEMPLATE_MARGIN_TOKENS} =
  require('./context-size.js');

/** @import {ContextSizeInput} from './context-size.js' */

describe('contextSizeFor', () => {

  /** @type {ContextSizeInput} */
  let input;

  beforeEach(() => {
    input = {promptTokens: 1200, answerTokens: 2048};
  });

  it('holds the prompt, the answer and what a template adds around them', () => {
    expect(contextSizeFor(input)).toBe(input.promptTokens + input.answerTokens + TEMPLATE_MARGIN_TOKENS);
  });
});

describe('exceedsTrainedContext', () => {

  it('accepts a context smaller than what the model was trained on', () => {
    expect(exceedsTrainedContext(2440, 262144)).toBe(false);
  });

  it('accepts a context of exactly what the model was trained on', () => {
    expect(exceedsTrainedContext(32768, 32768)).toBe(false);
  });

  it('refuses one token more than the model was trained on', () => {
    expect(exceedsTrainedContext(32769, 32768)).toBe(true);
  });
});

describe('gpuLayerLadder', () => {

  it('steps down in fifths from what the library placed, ending with nothing on the GPU', () => {
    expect(gpuLayerLadder(34)).toEqual([27, 20, 13, 6, 0]);
  });

  it('starts one step below the count that failed, so the first retry is a real reduction', () => {
    expect(gpuLayerLadder(34)[0]).toBeLessThan(34);
  });

  it('ends at nothing on the GPU whatever it started from, that being the placement VRAM cannot refuse', () => {
    const ladder = gpuLayerLadder(7);

    expect(ladder[ladder.length - 1]).toBe(0);
  });

  it('offers a model already entirely on the CPU nothing, it having nothing left to give', () => {
    expect(gpuLayerLadder(0)).toEqual([]);
  });

  it('drops a repeated step, so a small model is not loaded twice into the same placement', () => {
    expect(gpuLayerLadder(3)).toEqual([2, 1, 0]);
  });

  it('takes a single layer straight off the GPU', () => {
    expect(gpuLayerLadder(1)).toEqual([0]);
  });
});
