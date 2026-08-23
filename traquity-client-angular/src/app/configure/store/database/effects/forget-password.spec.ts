import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signalState, SignalState} from '@ngrx/signals';
import {Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {HotObservable} from 'rxjs/internal/testing/HotObservable';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureState} from '../../../../../bridge/startup-bridge.type';
import {ConfigureStoreState, initialState} from '../../configure.store';
import {setConfigureState} from '../../methods/set-configure-state';
import {ForgetPasswordBridge, forgetPasswordPipe} from './forget-password';

jest.mock('../../methods/set-configure-state', () => ({
  setConfigureState: jest.fn()
}));

type ForgetPassword = (databasePath: string) => Observable<void>;
type GetConfigureState = () => Observable<ConfigureState>;
type SetConfigureState = (signalStore: WritableSignalStore<ConfigureStoreState>, state: ConfigureState) => void;

describe('forgetPasswordPipe', (): void => {
  const databasePath: string = 'C:\\Users\\x\\traquity';
  const otherDatabasePath: string = 'D:\\backup\\traquity-test';

  let scheduler: TestScheduler;
  let store: SignalState<ConfigureStoreState>;
  let forgetPassword: jest.Mock<ForgetPassword>;
  let getConfigureState: jest.Mock<GetConfigureState>;
  let bridge: ForgetPasswordBridge;
  let setConfigureStateMock: jest.Mock<SetConfigureState>;
  let inputMarbles: string;
  let forgetMarbles: string;
  let reloadMarbles: string;
  let reloadValues: Record<string, ConfigureState>;

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    store = signalState<ConfigureStoreState>({...initialState, selectedDatabasePath: databasePath});
    forgetPassword = jest.fn<ForgetPassword>();
    getConfigureState = jest.fn<GetConfigureState>();
    bridge = {forgetPassword, getConfigureState};

    setConfigureStateMock = setConfigureState as jest.Mock<SetConfigureState>;
    setConfigureStateMock.mockReset();

    inputMarbles = 'a';
    forgetMarbles = '---(f|)';
    reloadMarbles = '--(r|)';
    reloadValues = {
      r: {
        configFileState: 'read',
        knownDatabases: [
          {
            path: otherDatabasePath,
            authState: 'passwordless'
          }
        ],
        logPath: 'C:\\apps\\traquity\\traquity.log',
        java: {path: null, signature: null}
      }
    };
  });

  function run(): void {
    scheduler.run(({cold, hot}: RunHelpers): void => {
      forgetPassword.mockReturnValue(cold<void>(forgetMarbles, {f: undefined}));
      getConfigureState.mockReturnValue(cold(reloadMarbles, reloadValues));
      const source$: HotObservable<void> = hot<void>(inputMarbles, {
        a: undefined,
        b: undefined
      });
      forgetPasswordPipe(store, bridge, store.selectedDatabasePath)(source$).subscribe();
    });
  }

  it('discards the entry and adopts what the app knows afterwards', (): void => {
    run();

    expect(forgetPassword).toHaveBeenCalledTimes(1);
    expect(forgetPassword).toHaveBeenCalledWith(databasePath);
    expect(setConfigureStateMock).toHaveBeenCalledTimes(1);
    expect(setConfigureStateMock).toHaveBeenCalledWith(store, reloadValues['r']);
  });

  it('re-reads nothing before the discard has gone through', (): void => {
    forgetMarbles = '-';

    run();

    expect(getConfigureState).not.toHaveBeenCalled();
    expect(setConfigureStateMock).not.toHaveBeenCalled();
  });

  it('adopts nothing before the re-read has answered', (): void => {
    reloadMarbles = '-';

    run();

    expect(setConfigureStateMock).not.toHaveBeenCalled();
  });

  it('drops a second click while the write is in flight', (): void => {
    inputMarbles = 'a-b';

    run();

    expect(forgetPassword).toHaveBeenCalledTimes(1);
    expect(forgetPassword).toHaveBeenCalledWith(databasePath);
  });

  it('discards nothing while no database is selected', (): void => {
    store = signalState<ConfigureStoreState>({...initialState});

    run();

    expect(forgetPassword).not.toHaveBeenCalled();
    expect(getConfigureState).not.toHaveBeenCalled();
    expect(setConfigureStateMock).not.toHaveBeenCalled();
  });
});
