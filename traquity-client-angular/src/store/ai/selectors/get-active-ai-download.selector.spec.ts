import {beforeEach, describe, expect, it} from '@jest/globals';
import {AiDownload, AiState} from '../ai.state';
import {initialState} from '../ai.reducer';
import {getActiveAiDownloadSelector} from './get-active-ai-download.selector';

describe('getActiveAiDownloadSelector', (): void => {
  let download: AiDownload;
  let state: AiState;

  beforeEach((): void => {
    download = {
      key: 'model-a',
      progress: {phase: 'downloading', receivedBytes: 40, totalBytes: 100, bytesPerSecond: 10, secondsRemaining: 6}
    };
    state = {
      ...initialState,
      catalogue: [
        {key: 'model-a', description: 'Model A', sizeBytes: 4_000_000_000, license: 'Apache-2.0', requiredVram: 5_000_000_000},
        {key: 'model-b', description: 'Model B', sizeBytes: 2_000_000_000, license: 'MIT', requiredVram: 3_000_000_000},
      ],
      download
    };
  });

  it('returns the key, description and progress of the catalogue entry the download names', (): void => {
    expect(getActiveAiDownloadSelector(state)).toEqual({
      key: 'model-a',
      description: 'Model A',
      progress: download.progress
    });
  });

  it('returns null when no download is running', (): void => {
    state = {...state, download: null};

    expect(getActiveAiDownloadSelector(state)).toBeNull();
  });

  it('returns null when the download names a key absent from the catalogue', (): void => {
    state = {...state, download: {...download, key: 'model-unknown'}};

    expect(getActiveAiDownloadSelector(state)).toBeNull();
  });
});
