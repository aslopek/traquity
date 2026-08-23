import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signalState, SignalState} from '@ngrx/signals';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {HotObservable} from 'rxjs/internal/testing/HotObservable';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {StartupBridgeService} from '../../../../../bridge/startup-bridge.service';
import {JavaDownloadProgress} from '../../../../../bridge/startup-bridge.type';
import {ConfigureStoreState, initialState} from '../../configure.store';
import {setDownloadProgress} from '../methods/set-download-progress';
import {trackDownloadProgressPipe} from './track-download-progress';

jest.mock('../methods/set-download-progress', () => ({
  setDownloadProgress: jest.fn()
}));

type SetDownloadProgress = (signalStore: WritableSignalStore<ConfigureStoreState>, progress: JavaDownloadProgress) => void;

describe('trackDownloadProgressPipe', (): void => {
  let progress: JavaDownloadProgress;
  let scheduler: TestScheduler;
  let store: SignalState<ConfigureStoreState>;
  let bridge: Pick<StartupBridgeService, 'javaDownloadProgress$'>;
  let setDownloadProgressMock: jest.Mock<SetDownloadProgress>;
  let progressMarbles: string;

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    progress = {
      phase: 'downloading',
      receivedBytes: 100,
      totalBytes: 200,
      bytesPerSecond: 10,
      secondsRemaining: 10
    };

    store = signalState<ConfigureStoreState>({...initialState});

    setDownloadProgressMock = setDownloadProgress as jest.Mock<SetDownloadProgress>;
    setDownloadProgressMock.mockReset();

    progressMarbles = '--p--p';
  });

  function run(): void {
    scheduler.run(({cold, hot}: RunHelpers): void => {
      bridge = {javaDownloadProgress$: cold(progressMarbles, {p: progress})};
      const source$: HotObservable<void> = hot<void>('a', {a: undefined});
      trackDownloadProgressPipe(store, bridge)(source$).subscribe();
    });
  }

  it('forwards every pushed progress event to the store', (): void => {
    run();

    expect(setDownloadProgressMock.mock.calls).toEqual([
      [store, progress],
      [store, progress]
    ]);
  });

  it('forwards nothing before the bridge pushes an event', (): void => {
    progressMarbles = '-';

    run();

    expect(setDownloadProgressMock).not.toHaveBeenCalled();
  });
});
