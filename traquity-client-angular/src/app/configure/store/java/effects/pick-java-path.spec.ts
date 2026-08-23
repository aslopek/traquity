import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signalState, SignalState} from '@ngrx/signals';
import {Observable, throwError} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {HotObservable} from 'rxjs/internal/testing/HotObservable';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {StartupBridgeService} from '../../../../../bridge/startup-bridge.service';
import {JavaPickResult, JavaVerification} from '../../../../../bridge/startup-bridge.type';
import {ConfigureStoreState, initialState} from '../../configure.store';
import {rejectJavaPick} from '../methods/reject-java-pick';
import {setJavaSetting} from '../methods/set-java-setting';
import {pickJavaPathPipe} from './pick-java-path';

jest.mock('../methods/set-java-setting', () => ({
  setJavaSetting: jest.fn()
}));
jest.mock('../methods/reject-java-pick', () => ({
  rejectJavaPick: jest.fn()
}));

type PickJava = (currentSetting: string | null) => Observable<JavaPickResult | null>;
type SetJavaSetting =
  (signalStore: WritableSignalStore<ConfigureStoreState>, path: string | null, verification: JavaVerification, signature: string | null)
    => void;
type RejectJavaPick = (signalStore: WritableSignalStore<ConfigureStoreState>, setting: string, message: string) => void;

describe('pickJavaPathPipe', (): void => {
  const currentJavaPath: string = 'C:\\jdk\\bin\\java.exe';
  const pickedPath: string = 'C:\\Program Files\\Java\\bin\\java.exe';
  let okVerification: JavaVerification;
  let errorVerification: JavaVerification;

  let scheduler: TestScheduler;
  let store: SignalState<ConfigureStoreState>;
  let pickJava: jest.Mock<PickJava>;
  let bridge: Pick<StartupBridgeService, 'pickJava'>;
  let setJavaSettingMock: jest.Mock<SetJavaSetting>;
  let rejectJavaPickMock: jest.Mock<RejectJavaPick>;
  let inputMarbles: string;
  let responseMarbles: string;
  let responseValues: Record<string, JavaPickResult | null>;

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    okVerification = {status: 'ok', javaPath: pickedPath, versionOutput: 'openjdk 25'};
    errorVerification = {status: 'error', message: 'not a JVM'};
    store = signalState<ConfigureStoreState>({...initialState, javaPath: currentJavaPath});
    pickJava = jest.fn<PickJava>();
    bridge = {pickJava};

    setJavaSettingMock = setJavaSetting as jest.Mock<SetJavaSetting>;
    setJavaSettingMock.mockReset();
    rejectJavaPickMock = rejectJavaPick as jest.Mock<RejectJavaPick>;
    rejectJavaPickMock.mockReset();

    inputMarbles = 'a';
    responseMarbles = '----(v|)';
    responseValues = {v: {setting: pickedPath, verification: okVerification}, n: null};
  });

  function run(): void {
    scheduler.run(({cold, hot}: RunHelpers): void => {
      pickJava.mockReturnValue(cold(responseMarbles, responseValues));
      const source$: HotObservable<void> = hot<void>(inputMarbles, {a: undefined, b: undefined});
      pickJavaPathPipe(store, bridge, store.javaPath)(source$).subscribe();
    });
  }

  it('opens the picker at the current java path', (): void => {
    run();

    expect(pickJava).toHaveBeenCalledTimes(1);
    expect(pickJava).toHaveBeenCalledWith(currentJavaPath);
  });

  it('adopts a successfully verified pick as the current setting', (): void => {
    run();

    expect(setJavaSettingMock).toHaveBeenCalledTimes(1);
    expect(setJavaSettingMock).toHaveBeenCalledWith(store, pickedPath, okVerification, null);
    expect(rejectJavaPickMock).not.toHaveBeenCalled();
  });

  it('records a rejected pick without touching the current setting', (): void => {
    responseValues = {v: {setting: pickedPath, verification: errorVerification}};

    run();

    expect(rejectJavaPickMock).toHaveBeenCalledTimes(1);
    expect(rejectJavaPickMock).toHaveBeenCalledWith(store, pickedPath, 'not a JVM');
    expect(setJavaSettingMock).not.toHaveBeenCalled();
  });

  it('adopts nothing when the dialog is cancelled', (): void => {
    responseMarbles = '----(n|)';

    run();

    expect(setJavaSettingMock).not.toHaveBeenCalled();
    expect(rejectJavaPickMock).not.toHaveBeenCalled();
  });

  it('changes nothing when the bridge call is rejected', (): void => {
    pickJava.mockReturnValue(throwError((): Error => new Error('the bridge is not available')));

    scheduler.run(({hot}: RunHelpers): void => {
      const source$: HotObservable<void> = hot<void>(inputMarbles, {a: undefined, b: undefined});
      pickJavaPathPipe(store, bridge, store.javaPath)(source$).subscribe();
    });

    expect(setJavaSettingMock).not.toHaveBeenCalled();
    expect(rejectJavaPickMock).not.toHaveBeenCalled();
  });

  it('drops a second click while the dialog is open', (): void => {
    inputMarbles = 'a-b';

    run();

    expect(pickJava).toHaveBeenCalledTimes(1);
    expect(pickJava).toHaveBeenCalledWith(currentJavaPath);
  });
});
