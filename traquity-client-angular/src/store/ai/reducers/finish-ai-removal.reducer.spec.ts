import {beforeEach, describe, expect, it} from '@jest/globals';
import {AiState} from '../ai.state';
import {initialState} from '../ai.reducer';
import {finishAiRemoval} from './finish-ai-removal.reducer';

describe('finishAiRemoval', (): void => {
  let state: AiState;

  beforeEach((): void => {
    state = {...initialState};
  });

  it('records no error on a removed outcome', (): void => {
    expect(finishAiRemoval(state, 'model-a', {status: 'removed'})).toEqual({...state, removalErrors: {}});
  });

  it('records the failure message for that key on a failed outcome', (): void => {
    expect(finishAiRemoval(state, 'model-a', {status: 'failed', message: 'No installed model for model-a'})).toEqual({
      ...state,
      removalErrors: {'model-a': 'No installed model for model-a'}
    });
  });

  it('keeps another key\'s error untouched alongside a new failure', (): void => {
    state = {...state, removalErrors: {'model-b': 'EBUSY: resource busy or locked'}};

    expect(finishAiRemoval(state, 'model-a', {status: 'failed', message: 'No installed model for model-a'}).removalErrors).toEqual({
      'model-b': 'EBUSY: resource busy or locked',
      'model-a': 'No installed model for model-a'
    });
  });

  it('clears a prior error for the key on a removed outcome', (): void => {
    state = {...state, removalErrors: {'model-a': 'EBUSY: resource busy or locked'}};

    expect(finishAiRemoval(state, 'model-a', {status: 'removed'}).removalErrors).toEqual({});
  });
});
