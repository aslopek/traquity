import {beforeEach, describe, expect, it} from '@jest/globals';
import {ElectronAiState, ModelEntry} from '../../../bridge/ai-bridge.type';
import {AiState} from '../ai.state';
import {overwriteAiState} from './overwrite-ai-state.reducer';
import {initialState} from "../ai.reducer";

describe('overwriteAiState', (): void => {
  const modelAPath: string = 'C:\\traquity\\ai\\models\\model-a.gguf';
  const modelBPath: string = 'C:\\traquity\\ai\\models\\model-b.gguf';

  let state: AiState;
  let electronAiState: ElectronAiState;

  beforeEach((): void => {
    state = {...initialState};
    electronAiState = {
      isConfirmed: true,
      catalogue: [{key: 'model-a', description: 'Model A', sizeBytes: 3013027808, license: 'Apache-2.0', requiredVram: 5368709120}],
      models: {'model-a': {path: modelAPath, active: true}},
      verdicts: {'model-a': {verdict: 'ok', reason: null}},
      probeFailed: false
    };
  });

  it('overwrites isConfirmed, catalogue and models with what the bridge reported', (): void => {
    expect(overwriteAiState(state, electronAiState)).toEqual({...state, ...electronAiState});
  });

  it('preserves an in-progress download instead of wiping it', (): void => {
    state = {
      ...state,
      download: {key: 'model-a', progress: {phase: 'downloading', receivedBytes: 1, totalBytes: 2, bytesPerSecond: 1, secondsRemaining: 1}}
    };

    expect(overwriteAiState(state, electronAiState).download).toBe(state.download);
  });

  it('preserves preexisting download errors instead of wiping them', (): void => {
    state = {...state, downloadErrors: {'model-a': 'Not enough free disk space'}};

    expect(overwriteAiState(state, electronAiState).downloadErrors).toBe(state.downloadErrors);
  });

  describe('with more than one entry reported active', (): void => {
    beforeEach((): void => {
      electronAiState = {
        ...electronAiState,
        catalogue: [
          {key: 'model-a', description: 'Model A', sizeBytes: 3013027808, license: 'Apache-2.0', requiredVram: 5368709120},
          {key: 'model-b', description: 'Model B', sizeBytes: 1280835840, license: 'Apache-2.0', requiredVram: 3221225472}
        ],
        models: {
          'model-a': {path: modelAPath, active: true},
          'model-b': {path: modelBPath, active: true}
        }
      };
    });

    it('resolves to exactly one active entry', (): void => {
      const {models} = overwriteAiState(state, electronAiState);

      expect(Object.values(models).filter((model: ModelEntry): boolean => model.active)).toHaveLength(1);
    });

    it('keeps the first reported key active and clears the rest', (): void => {
      expect(overwriteAiState(state, electronAiState).models).toEqual({
        'model-a': {path: modelAPath, active: true},
        'model-b': {path: modelBPath, active: false}
      });
    });

    it('picks the same entry again on a further ingestion of the same disagreeing state', (): void => {
      const firstPick: Record<string, ModelEntry> = overwriteAiState(state, electronAiState).models;
      const secondPick: Record<string, ModelEntry> = overwriteAiState(state, electronAiState).models;

      expect(secondPick).toEqual(firstPick);
    });
  });

  describe('with exactly one entry reported active', (): void => {
    it('reports that entry as the active one', (): void => {
      expect(overwriteAiState(state, electronAiState).models).toEqual({'model-a': {path: modelAPath, active: true}});
    });
  });

  describe('with no entry reported active', (): void => {
    beforeEach((): void => {
      electronAiState = {...electronAiState, models: {'model-a': {path: modelAPath, active: false}}};
    });

    it('reports no entry as active', (): void => {
      expect(overwriteAiState(state, electronAiState).models).toEqual({'model-a': {path: modelAPath, active: false}});
    });
  });
});
