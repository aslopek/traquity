import {beforeEach, describe, expect, it} from '@jest/globals';
import {getState, signalState, SignalState} from '@ngrx/signals';
import {JavaDownloadProgress, JavaVerification} from '../../../../../bridge/startup-bridge.type';
import {ConfigureStoreState, initialState} from '../../configure.store';
import {setJavaSetting} from './set-java-setting';

describe('setJavaSetting', (): void => {
  const javaPath: string = 'C:\\jdk\\bin\\java.exe';

  let okVerification: JavaVerification;
  let store: SignalState<ConfigureStoreState>;

  beforeEach((): void => {
    okVerification = {status: 'ok', javaPath, versionOutput: 'openjdk 25'};
    store = signalState<ConfigureStoreState>({...initialState});
  });

  it('stores the given path, signature and verification for an ok result', (): void => {
    setJavaSetting(store, javaPath, okVerification, 'c2ln');

    expect(getState(store)).toEqual({...initialState, javaPath, javaSignature: 'c2ln', javaVerification: okVerification});
  });

  it('stores a null path for the automatic candidate', (): void => {
    setJavaSetting(store, null, okVerification, null);

    expect(getState(store)).toEqual({...initialState, javaPath: null, javaSignature: null, javaVerification: okVerification});
  });

  describe('with a stale pick error', (): void => {
    beforeEach((): void => {
      store = signalState<ConfigureStoreState>({...initialState, javaPickError: {setting: 'C:\\bad\\java.exe', message: 'not a JVM'}});
    });

    it('clears it once an ok result is adopted', (): void => {
      setJavaSetting(store, javaPath, okVerification, 'c2ln');

      expect(getState(store).javaPickError).toBeNull();
    });
  });

  describe('with a download in progress', (): void => {
    beforeEach((): void => {
      const progress: JavaDownloadProgress = {
        phase: 'downloading',
        receivedBytes: 100,
        totalBytes: 200,
        bytesPerSecond: 10,
        secondsRemaining: 10
      };
      store = signalState<ConfigureStoreState>({...initialState, javaDownload: progress});
    });

    it('clears it once an ok result is adopted', (): void => {
      setJavaSetting(store, javaPath, okVerification, 'c2ln');

      expect(getState(store).javaDownload).toBeNull();
    });
  });

  describe('with a path and signature already stored', (): void => {
    beforeEach((): void => {
      store = signalState<ConfigureStoreState>({...initialState, javaPath, javaSignature: 'stored'});
    });

    it('stores only the error, leaving the path and signature untouched', (): void => {
      const errorVerification: JavaVerification = {status: 'error', message: 'not a JVM'};

      setJavaSetting(store, 'C:\\other\\java.exe', errorVerification, 'ignored');

      expect(getState(store)).toEqual({
        ...initialState,
        javaPath,
        javaSignature: 'stored',
        javaVerification: errorVerification
      });
    });
  });
});
