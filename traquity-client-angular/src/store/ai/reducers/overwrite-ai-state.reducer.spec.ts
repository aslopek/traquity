import {beforeEach, describe, expect, it} from '@jest/globals';
import {ElectronAiState} from '../../../app/startup/startup-bridge.type';
import {AiState} from '../ai.state';
import {overwriteAiState} from './overwrite-ai-state.reducer';
import {initialState} from "../ai.reducer";

describe('overwriteAiState', (): void => {
  let state: AiState;
  let electronAiState: ElectronAiState;

  beforeEach((): void => {
    state = {...initialState};
    electronAiState = {
      isConfirmed: true,
      catalogue: [{key: 'model-a', description: 'Model A', sizeBytes: 3013027808, license: 'Apache-2.0'}],
      models: {'model-a': {path: 'C:\\traquity\\ai\\models\\model-a.gguf', active: true}}
    };
  });

  it('overwrites isConfirmed, catalogue and models with what the bridge reported', (): void => {
    expect(overwriteAiState(state, electronAiState)).toEqual({...state, ...electronAiState});
  });

  it('preserves an in-progress download rather than wiping it', (): void => {
    state = {
      ...state,
      download: {key: 'model-a', progress: {phase: 'downloading', receivedBytes: 1, totalBytes: 2, bytesPerSecond: 1, secondsRemaining: 1}}
    };

    expect(overwriteAiState(state, electronAiState).download).toBe(state.download);
  });

  it('preserves download errors rather than wiping them', (): void => {
    state = {...state, downloadErrors: {'model-a': 'Not enough free disk space'}};

    expect(overwriteAiState(state, electronAiState).downloadErrors).toBe(state.downloadErrors);
  });
});
