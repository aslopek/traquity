import {beforeEach, describe, expect, it} from '@jest/globals';
import {getState, signalState, SignalState} from '@ngrx/signals';
import {JavaDownloadProgress, JavaVerification} from '../../../../../bridge/startup-bridge.type';
import {ConfigureStoreState, initialState} from '../../configure.store';
import {failDownload} from './fail-download';

describe('failDownload', (): void => {
  let okVerification: JavaVerification;
  let progress: JavaDownloadProgress;
  let store: SignalState<ConfigureStoreState>;

  beforeEach((): void => {
    okVerification = {status: 'ok', javaPath: 'C:\\jdk\\bin\\java.exe', versionOutput: 'openjdk 25'};
    progress = {
      phase: 'downloading',
      receivedBytes: 100,
      totalBytes: 200,
      bytesPerSecond: 10,
      secondsRemaining: 10
    };
    store = signalState<ConfigureStoreState>({...initialState, javaDownload: progress, javaVerification: okVerification});
  });

  it('records the failure and clears the in-progress download', (): void => {
    failDownload(store, 'HTTP 503');

    expect(getState(store)).toEqual({
      ...initialState,
      javaDownload: null,
      javaDownloadError: 'HTTP 503',
      javaVerification: okVerification
    });
  });

  it('leaves the current verification untouched', (): void => {
    const verificationBefore: JavaVerification = {...okVerification};

    failDownload(store, 'HTTP 503');

    expect(getState(store).javaVerification).toEqual(verificationBefore);
    expect(getState(store).javaVerification).toBe(okVerification);
  });
});
