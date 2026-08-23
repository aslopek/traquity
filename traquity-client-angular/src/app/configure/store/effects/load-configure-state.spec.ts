import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signalState, SignalState} from '@ngrx/signals';
import {Observable} from 'rxjs';
import {RunHelpers, TestScheduler} from 'rxjs/testing';
import {HotObservable} from 'rxjs/internal/testing/HotObservable';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {StartupBridgeService} from '../../../../bridge/startup-bridge.service';
import {ConfigureState} from '../../../../bridge/startup-bridge.type';
import {ConfigureStoreState, initialState} from '../configure.store';
import {JavaSettingToVerify} from '../java/effects/verify-java-setting';
import {setConfigureState} from '../methods/set-configure-state';
import {loadConfigureStatePipe} from './load-configure-state';

jest.mock('../methods/set-configure-state', () => ({
  setConfigureState: jest.fn()
}));

type GetConfigureState = () => Observable<ConfigureState>;
type SetConfigureState = (signalStore: WritableSignalStore<ConfigureStoreState>, state: ConfigureState) => void;

describe('loadConfigureStatePipe', (): void => {
  const databasePath: string = 'C:\\Users\\x\\traquity';

  let scheduler: TestScheduler;
  let store: SignalState<ConfigureStoreState>;
  let getConfigureState: jest.Mock<GetConfigureState>;
  let bridge: Pick<StartupBridgeService, 'getConfigureState'>;
  let setConfigureStateMock: jest.Mock<SetConfigureState>;
  let triggerJavaVerification: jest.Mock<(setting: JavaSettingToVerify) => void>;
  let inputMarbles: string;
  let responseMarbles: string;
  let responseValues: Record<string, ConfigureState>;

  beforeEach((): void => {
    scheduler = new TestScheduler((actual: unknown, expected: unknown): void => {
      expect(actual).toEqual(expected);
    });

    store = signalState<ConfigureStoreState>({...initialState});
    getConfigureState = jest.fn<GetConfigureState>();
    bridge = {getConfigureState};
    triggerJavaVerification = jest.fn<(setting: JavaSettingToVerify) => void>();

    setConfigureStateMock = setConfigureState as jest.Mock<SetConfigureState>;
    setConfigureStateMock.mockReset();

    inputMarbles = 'a';
    responseMarbles = '--(v|)';
    responseValues = {
      v: {
        configFileState: 'read',
        knownDatabases: [
          {
            path: databasePath,
            authState: 'scrypt'
          }
        ],
        logPath: 'C:\\apps\\traquity\\traquity.log',
        java: {path: 'C:\\jdk\\bin\\java.exe', signature: 'c2ln'}
      }
    };
  });

  function run(): void {
    scheduler.run(({cold, hot}: RunHelpers): void => {
      getConfigureState.mockReturnValue(cold(responseMarbles, responseValues));
      const source$: HotObservable<void> = hot<void>(inputMarbles, {a: undefined});
      loadConfigureStatePipe(store, bridge, triggerJavaVerification)(source$).subscribe();
    });
  }

  it('adopts what the bridge reports', (): void => {
    run();

    expect(getConfigureState).toHaveBeenCalledTimes(1);
    expect(getConfigureState).toHaveBeenCalledWith();
    expect(setConfigureStateMock).toHaveBeenCalledTimes(1);
    expect(setConfigureStateMock).toHaveBeenCalledWith(store, responseValues['v']);
  });

  it('triggers the java section\'s literal check of the stored setting', (): void => {
    run();

    expect(triggerJavaVerification).toHaveBeenCalledTimes(1);
    expect(triggerJavaVerification).toHaveBeenCalledWith({path: 'C:\\jdk\\bin\\java.exe', signature: 'c2ln'});
  });

  it('adopts nothing before the bridge answers', (): void => {
    responseMarbles = '-';

    run();

    expect(setConfigureStateMock).not.toHaveBeenCalled();
    expect(triggerJavaVerification).not.toHaveBeenCalled();
  });
});
