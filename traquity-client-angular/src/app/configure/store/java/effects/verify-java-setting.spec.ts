import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signalState, SignalState} from '@ngrx/signals';
import {Observable, throwError} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {HotObservable} from 'rxjs/internal/testing/HotObservable';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {StartupBridgeService} from '../../../../../bridge/startup-bridge.service';
import {JavaVerification} from '../../../../../bridge/startup-bridge.type';
import {ConfigureStoreState, initialState} from '../../configure.store';
import {setJavaSetting} from '../methods/set-java-setting';
import {startJavaVerification} from '../methods/start-java-verification';
import {JavaSettingToVerify, verifyJavaSettingPipe} from './verify-java-setting';

jest.mock('../methods/set-java-setting', () => ({
  setJavaSetting: jest.fn()
}));
jest.mock('../methods/start-java-verification', () => ({
  startJavaVerification: jest.fn()
}));

type VerifyJava = (setting: string | null) => Observable<JavaVerification>;
type SetJavaSetting =
  (signalStore: WritableSignalStore<ConfigureStoreState>, path: string | null, verification: JavaVerification, signature: string | null)
    => void;
type StartJavaVerification = (signalStore: WritableSignalStore<ConfigureStoreState>) => void;

describe('verifyJavaSettingPipe', (): void => {
  const javaPath: string = 'C:\\jdk\\bin\\java.exe';

  let okVerification: JavaVerification;
  let scheduler: TestScheduler;
  let store: SignalState<ConfigureStoreState>;
  let verifyJava: jest.Mock<VerifyJava>;
  let bridge: Pick<StartupBridgeService, 'verifyJava'>;
  let setJavaSettingMock: jest.Mock<SetJavaSetting>;
  let startJavaVerificationMock: jest.Mock<StartJavaVerification>;
  let inputMarbles: string;
  let inputValues: Record<string, JavaSettingToVerify>;
  let responseMarbles: string;

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    okVerification = {status: 'ok', javaPath, versionOutput: 'openjdk 25'};
    store = signalState<ConfigureStoreState>({...initialState});
    verifyJava = jest.fn<VerifyJava>();
    bridge = {verifyJava};

    setJavaSettingMock = setJavaSetting as jest.Mock<SetJavaSetting>;
    setJavaSettingMock.mockReset();
    startJavaVerificationMock = startJavaVerification as jest.Mock<StartJavaVerification>;
    startJavaVerificationMock.mockReset();

    inputMarbles = 'a';
    inputValues = {a: {path: javaPath, signature: 'c2ln'}, b: {path: null, signature: null}};
    responseMarbles = '----(v|)';
  });

  function run(): void {
    scheduler.run(({cold, hot}: RunHelpers): void => {
      verifyJava.mockReturnValue(cold(responseMarbles, {v: okVerification}));
      const source$: HotObservable<JavaSettingToVerify> = hot<JavaSettingToVerify>(inputMarbles, inputValues);
      verifyJavaSettingPipe(store, bridge)(source$).subscribe();
    });
  }

  it('marks the verification as pending before calling the bridge', (): void => {
    run();

    expect(startJavaVerificationMock).toHaveBeenCalledTimes(1);
    expect(startJavaVerificationMock).toHaveBeenCalledWith(store);
  });

  it('verifies the given path', (): void => {
    run();

    expect(verifyJava).toHaveBeenCalledTimes(1);
    expect(verifyJava).toHaveBeenCalledWith(javaPath);
  });

  it('verifies the PATH candidate for a null path', (): void => {
    inputValues = {a: {path: null, signature: null}};

    run();

    expect(verifyJava).toHaveBeenCalledTimes(1);
    expect(verifyJava).toHaveBeenCalledWith(null);
  });

  it('adopts the result with the path and signature it was triggered with', (): void => {
    run();

    expect(setJavaSettingMock).toHaveBeenCalledTimes(1);
    expect(setJavaSettingMock).toHaveBeenCalledWith(store, javaPath, okVerification, 'c2ln');
  });

  it('ends the pending state with an error when the bridge call is rejected', (): void => {
    verifyJava.mockReturnValue(throwError((): Error => new Error('the bridge is not available')));

    scheduler.run(({hot}: RunHelpers): void => {
      const source$: HotObservable<JavaSettingToVerify> = hot<JavaSettingToVerify>(inputMarbles, inputValues);
      verifyJavaSettingPipe(store, bridge)(source$).subscribe();
    });

    expect(setJavaSettingMock).toHaveBeenCalledTimes(1);
    expect(setJavaSettingMock).toHaveBeenCalledWith(store, javaPath, {status: 'error', message: 'the bridge is not available'}, 'c2ln');
  });

  it('adopts nothing before the bridge answers', (): void => {
    responseMarbles = '-';

    run();

    expect(setJavaSettingMock).not.toHaveBeenCalled();
  });

  it('drops a second trigger while a verification is in flight', (): void => {
    inputMarbles = 'ab';

    run();

    expect(verifyJava).toHaveBeenCalledTimes(1);
    expect(verifyJava).toHaveBeenCalledWith(javaPath);
  });
});
