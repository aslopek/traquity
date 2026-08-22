import {beforeEach, describe, expect, it} from '@jest/globals';
import {AiState} from '../ai.state';
import {initialState} from '../ai.reducer';
import {finishAiDownload} from './finish-ai-download.reducer';

describe('finishAiDownload', (): void => {
  let state: AiState;

  beforeEach((): void => {
    state = {
      ...initialState,
      download: {
        key: 'model-a',
        progress: {phase: 'verifying', receivedBytes: 0, totalBytes: null, bytesPerSecond: 0, secondsRemaining: null}
      }
    };
  });

  it('clears the in-progress download on completion, recording no error', (): void => {
    expect(finishAiDownload(state, 'model-a', {status: 'completed'})).toEqual({...state, download: null, downloadErrors: {}});
  });

  it('clears the in-progress download on cancellation, recording no error', (): void => {
    expect(finishAiDownload(state, 'model-a', {status: 'cancelled'})).toEqual({...state, download: null, downloadErrors: {}});
  });

  it('clears the in-progress download on failure, recording its message for that key', (): void => {
    expect(finishAiDownload(state, 'model-a', {status: 'failed', message: 'Hash verification failed'})).toEqual({
      ...state,
      download: null,
      downloadErrors: {'model-a': 'Hash verification failed'}
    });
  });

  it('keeps another key\'s error untouched alongside a new failure', (): void => {
    state = {...state, downloadErrors: {'model-b': 'Not enough free disk space'}};

    expect(finishAiDownload(state, 'model-a', {status: 'failed', message: 'Hash verification failed'}).downloadErrors).toEqual({
      'model-b': 'Not enough free disk space',
      'model-a': 'Hash verification failed'
    });
  });
});
