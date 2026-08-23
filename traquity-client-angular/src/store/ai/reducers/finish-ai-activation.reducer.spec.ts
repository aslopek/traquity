import {beforeEach, describe, expect, it} from '@jest/globals';
import {AiState} from '../ai.state';
import {initialState} from '../ai.reducer';
import {finishAiActivation} from './finish-ai-activation.reducer';

describe('finishAiActivation', (): void => {
  let state: AiState;

  beforeEach((): void => {
    state = {...initialState};
  });

  it('records no error on an activated outcome', (): void => {
    expect(finishAiActivation(state, 'model-a', {status: 'activated'})).toEqual({...state, activationErrors: {}});
  });

  it('records the failure message for that key on a failed outcome', (): void => {
    expect(finishAiActivation(state, 'model-a', {status: 'failed', message: 'No installed model for model-a'})).toEqual({
      ...state,
      activationErrors: {'model-a': 'No installed model for model-a'}
    });
  });

  it('keeps another key\'s error untouched alongside a new failure', (): void => {
    state = {...state, activationErrors: {'model-b': 'No installed model for model-b'}};

    expect(finishAiActivation(state, 'model-a', {status: 'failed', message: 'No installed model for model-a'}).activationErrors).toEqual({
      'model-b': 'No installed model for model-b',
      'model-a': 'No installed model for model-a'
    });
  });

  it('clears a prior error for the key on an activated outcome', (): void => {
    state = {
      ...state,
      activationErrors: {
        'model-b': 'No installed model for model-b',
        'model-a': 'No installed model for model-a'
      }
    };

    expect(finishAiActivation(state, 'model-a', {status: 'activated'}).activationErrors).toEqual({
      'model-b': 'No installed model for model-b'
    });
  });
});
