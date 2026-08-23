import {beforeEach, describe, expect, it} from '@jest/globals';
import {getState, signalState, SignalState} from '@ngrx/signals';
import {JavaDownloadProgress} from '../../../../../bridge/startup-bridge.type';
import {ConfigureStoreState, initialState} from '../../configure.store';
import {setDownloadProgress} from './set-download-progress';

describe('setDownloadProgress', (): void => {
  let progress: JavaDownloadProgress;
  let store: SignalState<ConfigureStoreState>;

  beforeEach((): void => {
    progress = {
      phase: 'downloading',
      receivedBytes: 100,
      totalBytes: 200,
      bytesPerSecond: 10,
      secondsRemaining: 10
    };
    store = signalState<ConfigureStoreState>({...initialState, javaDownloadError: 'previous failure'});
  });

  it('stores the progress and clears a previous download error', (): void => {
    setDownloadProgress(store, progress);

    expect(getState(store)).toEqual({...initialState, javaDownload: progress, javaDownloadError: null});
  });
});
