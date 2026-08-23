import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signalState, SignalState} from '@ngrx/signals';
import {Observable, throwError} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {HotObservable} from 'rxjs/internal/testing/HotObservable';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {StartupBridgeService} from '../../../../../bridge/startup-bridge.service';
import {JavaDownloadOutcome, JavaDownloadProgress, JavaVerification} from '../../../../../bridge/startup-bridge.type';
import {ConfigureStoreState, initialState} from '../../configure.store';
import {failDownload} from '../methods/fail-download';
import {setDownloadProgress} from '../methods/set-download-progress';
import {setJavaSetting} from '../methods/set-java-setting';
import {downloadCorrettoPipe} from './download-corretto';

jest.mock('../methods/set-java-setting', () => ({
  setJavaSetting: jest.fn()
}));
jest.mock('../methods/set-download-progress', () => ({
  setDownloadProgress: jest.fn()
}));
jest.mock('../methods/fail-download', () => ({
  failDownload: jest.fn()
}));

type DownloadJava = () => Observable<JavaDownloadOutcome>;
type SetJavaSetting =
  (signalStore: WritableSignalStore<ConfigureStoreState>, path: string | null, verification: JavaVerification, signature: string | null)
    => void;
type SetDownloadProgress = (signalStore: WritableSignalStore<ConfigureStoreState>, progress: JavaDownloadProgress) => void;
type FailDownload = (signalStore: WritableSignalStore<ConfigureStoreState>, message: string) => void;

describe('downloadCorrettoPipe', (): void => {
  const javaPath: string = 'C:\\apps\\traquity\\java\\bin\\java.exe';
  let verification: JavaVerification;

  let scheduler: TestScheduler;
  let store: SignalState<ConfigureStoreState>;
  let downloadJava: jest.Mock<DownloadJava>;
  let bridge: Pick<StartupBridgeService, 'downloadJava'>;
  let setJavaSettingMock: jest.Mock<SetJavaSetting>;
  let setDownloadProgressMock: jest.Mock<SetDownloadProgress>;
  let failDownloadMock: jest.Mock<FailDownload>;
  let inputMarbles: string;
  let responseMarbles: string;
  let responseValues: Record<string, JavaDownloadOutcome>;

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    verification = {status: 'ok', javaPath, versionOutput: 'openjdk 25'};
    store = signalState<ConfigureStoreState>({...initialState});
    downloadJava = jest.fn<DownloadJava>();
    bridge = {downloadJava};

    setJavaSettingMock = setJavaSetting as jest.Mock<SetJavaSetting>;
    setJavaSettingMock.mockReset();
    setDownloadProgressMock = setDownloadProgress as jest.Mock<SetDownloadProgress>;
    setDownloadProgressMock.mockReset();
    failDownloadMock = failDownload as jest.Mock<FailDownload>;
    failDownloadMock.mockReset();

    inputMarbles = 'a';
    responseMarbles = '----(v|)';
    responseValues = {
      v: {status: 'completed', javaPath, signature: 'c2ln', verification},
      f: {status: 'failed', message: 'HTTP 503'}
    };
  });

  function run(): void {
    scheduler.run(({cold, hot}: RunHelpers): void => {
      downloadJava.mockReturnValue(cold(responseMarbles, responseValues));
      const source$: HotObservable<void> = hot<void>(inputMarbles, {a: undefined, b: undefined});
      downloadCorrettoPipe(store, bridge)(source$).subscribe();
    });
  }

  it('sets an initial zero-progress state before invoking the download', (): void => {
    run();

    expect(setDownloadProgressMock).toHaveBeenCalledTimes(1);
    expect(setDownloadProgressMock).toHaveBeenCalledWith(store, {
      phase: 'downloading',
      receivedBytes: 0,
      totalBytes: null,
      bytesPerSecond: 0,
      secondsRemaining: null
    });
  });

  it('adopts a completed download with the verification and the signature it answered with', (): void => {
    run();

    expect(setJavaSettingMock).toHaveBeenCalledTimes(1);
    expect(setJavaSettingMock).toHaveBeenCalledWith(store, javaPath, verification, 'c2ln');
    expect(failDownloadMock).not.toHaveBeenCalled();
  });

  it('records a failed download without adopting anything', (): void => {
    responseMarbles = '----(f|)';

    run();

    expect(failDownloadMock).toHaveBeenCalledTimes(1);
    expect(failDownloadMock).toHaveBeenCalledWith(store, 'HTTP 503');
    expect(setJavaSettingMock).not.toHaveBeenCalled();
  });

  it('records a rejected call as a failed download, so the section stays operable', (): void => {
    downloadJava.mockReturnValue(throwError((): Error => new Error('the bridge is not available')));

    scheduler.run(({hot}: RunHelpers): void => {
      const source$: HotObservable<void> = hot<void>(inputMarbles, {a: undefined, b: undefined});
      downloadCorrettoPipe(store, bridge)(source$).subscribe();
    });

    expect(failDownloadMock).toHaveBeenCalledTimes(1);
    expect(failDownloadMock).toHaveBeenCalledWith(store, 'the bridge is not available');
    expect(setJavaSettingMock).not.toHaveBeenCalled();
  });

  it('adopts nothing before the download settles', (): void => {
    responseMarbles = '-';

    run();

    expect(setJavaSettingMock).not.toHaveBeenCalled();
    expect(failDownloadMock).not.toHaveBeenCalled();
  });

  it('drops a second trigger while a download is in flight', (): void => {
    inputMarbles = 'a-b';

    run();

    expect(downloadJava).toHaveBeenCalledTimes(1);
    expect(downloadJava).toHaveBeenCalledWith();
  });
});
