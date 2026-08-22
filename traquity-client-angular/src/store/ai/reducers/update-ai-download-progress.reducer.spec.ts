import {beforeEach, describe, expect, it} from '@jest/globals';
import {AiDownloadProgress} from '../../../app/startup/startup-bridge.type';
import {AiState} from '../ai.state';
import {initialState} from '../ai.reducer';
import {updateAiDownloadProgress} from './update-ai-download-progress.reducer';

describe('updateAiDownloadProgress', (): void => {
  let state: AiState;
  let progress: AiDownloadProgress;

  beforeEach((): void => {
    state = {
      ...initialState,
      download: {
        key: 'model-a',
        progress: {phase: 'downloading', receivedBytes: 0, totalBytes: 100, bytesPerSecond: 0, secondsRemaining: null}
      }
    };
    progress = {phase: 'downloading', receivedBytes: 40, totalBytes: 100, bytesPerSecond: 10, secondsRemaining: 6};
  });

  it('replaces the progress of the in-progress download, keeping its key', (): void => {
    expect(updateAiDownloadProgress(state, progress).download).toEqual({key: 'model-a', progress});
  });

  it('leaves the state untouched when nothing is downloading', (): void => {
    state = {...state, download: null};

    expect(updateAiDownloadProgress(state, progress)).toBe(state);
  });
});
