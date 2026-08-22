import {describe, expect, it} from '@jest/globals';
import {AiState} from '../ai.state';
import {overwriteAiState} from './overwrite-ai-state.reducer';
import {initialState} from "../ai.reducer";

describe('overwriteAiState', (): void => {
  it('replaces the whole state with what the bridge reported', (): void => {
    const state: AiState = {...initialState};
    const aiState: AiState = {
      isConfirmed: true,
      catalogue: [{key: 'model-a', description: 'Model A', sizeBytes: 3013027808, license: 'Apache-2.0'}],
      models: {'model-a': {path: 'C:\\traquity\\ai\\models\\model-a.gguf', active: true}}
    };

    expect(overwriteAiState(state, aiState)).toEqual(aiState);
  });
});
