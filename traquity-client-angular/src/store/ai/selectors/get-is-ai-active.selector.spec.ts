import {beforeEach, describe, expect, it} from '@jest/globals';
import {AiState} from '../ai.state';
import {getIsAiActiveSelector} from './get-is-ai-active.selector';
import {initialState} from "../ai.reducer";

describe('getIsAiActiveSelector', (): void => {
  let state: AiState;

  beforeEach((): void => {
    state = {
      ...initialState,
      isConfirmed: true,
      models: {'model-a': {path: 'C:\\traquity\\ai\\models\\model-a.gguf', active: true}}
    };
  });

  it('reads true when the notice is confirmed and a model is active', (): void => {
    expect(getIsAiActiveSelector(state)).toBe(true);
  });

  it('reads false without the bridge ever having reported state', (): void => {
    expect(getIsAiActiveSelector(initialState)).toBe(false);
  });

  it('reads false when the notice is not confirmed', (): void => {
    state.isConfirmed = false;

    expect(getIsAiActiveSelector(state)).toBe(false);
  });

  it('reads false when no model is active', (): void => {
    state.models['model-a'].active = false;

    expect(getIsAiActiveSelector(state)).toBe(false);
  });

  it('reads false when no model is installed', (): void => {
    state.models = {};

    expect(getIsAiActiveSelector(state)).toBe(false);
  });
});
