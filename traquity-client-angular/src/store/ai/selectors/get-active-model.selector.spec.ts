import {beforeEach, describe, expect, it} from '@jest/globals';
import {AiState} from '../ai.state';
import {initialState} from '../ai.reducer';
import {getActiveModelSelector} from './get-active-model.selector';

describe('getActiveModelSelector', (): void => {
  const modelAPath: string = 'C:\\traquity\\ai\\models\\model-a.gguf';
  const modelBPath: string = 'C:\\traquity\\ai\\models\\model-b.gguf';

  let state: AiState;

  beforeEach((): void => {
    state = {
      ...initialState,
      models: {
        'model-a': {path: modelAPath, active: false},
        'model-b': {path: modelBPath, active: true}
      }
    };
  });

  it('returns the key and path of the model marked active', (): void => {
    expect(getActiveModelSelector(state)).toEqual({key: 'model-b', path: modelBPath});
  });

  it('returns null when every installed model is inactive', (): void => {
    state.models['model-b'].active = false;

    expect(getActiveModelSelector(state)).toBeNull();
  });

  it('returns null when no model is installed', (): void => {
    state = {...state, models: {}};

    expect(getActiveModelSelector(state)).toBeNull();
  });
});
