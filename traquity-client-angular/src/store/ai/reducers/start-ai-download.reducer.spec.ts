import {beforeEach, describe, expect, it} from '@jest/globals';
import {AiState} from '../ai.state';
import {initialState} from '../ai.reducer';
import {startAiDownload} from './start-ai-download.reducer';

describe('startAiDownload', (): void => {
  let state: AiState;

  beforeEach((): void => {
    state = {...initialState};
  });

  it('sets an indeterminate downloading progress for the given key', (): void => {
    expect(startAiDownload(state, 'model-a').download).toEqual({
      key: 'model-a',
      progress: {phase: 'downloading', receivedBytes: 0, totalBytes: null, bytesPerSecond: 0, secondsRemaining: null}
    });
  });

  it('clears a previous error for that key', (): void => {
    state = {...state, downloadErrors: {'model-a': 'Not enough free disk space'}};

    expect(startAiDownload(state, 'model-a').downloadErrors).toEqual({});
  });

  it('keeps another key\'s error untouched', (): void => {
    state = {...state, downloadErrors: {'model-b': 'Hash verification failed'}};

    expect(startAiDownload(state, 'model-a').downloadErrors).toEqual({'model-b': 'Hash verification failed'});
  });

  it('replaces a previous in-progress download for another key', (): void => {
    state = {
      ...state,
      download: {
        key: 'model-b',
        progress: {phase: 'verifying', receivedBytes: 0, totalBytes: null, bytesPerSecond: 0, secondsRemaining: null}
      }
    };

    expect(startAiDownload(state, 'model-a').download?.key).toBe('model-a');
  });
});
