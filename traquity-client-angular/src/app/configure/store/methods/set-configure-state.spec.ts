import {beforeEach, describe, expect, it} from '@jest/globals';
import {getState, signalState, SignalState} from '@ngrx/signals';
import {ConfigureState} from '../../../../bridge/startup-bridge.type';
import {ConfigureStoreState, initialState} from '../configure.store';
import {setConfigureState} from './set-configure-state';

describe('setConfigureState', (): void => {
  const databasePath: string = 'C:\\Users\\x\\traquity';

  let store: SignalState<ConfigureStoreState>;
  let configureState: ConfigureState;

  beforeEach((): void => {
    store = signalState<ConfigureStoreState>({...initialState});
    configureState = {
      configFileState: 'read',
      knownDatabases: [
        {
          path: databasePath,
          authState: 'scrypt'
        }
      ],
      logPath: 'C:\\apps\\traquity\\traquity.log',
      java: {path: null, signature: null}
    };
  });

  it('adopts the read outcome, the known databases and the log path', (): void => {
    setConfigureState(store, configureState);

    expect(getState(store)).toEqual({
      ...initialState,
      configFileState: configureState.configFileState,
      knownDatabases: configureState.knownDatabases,
      logPath: configureState.logPath
    });
  });

  describe('with a selection already made', (): void => {
    beforeEach((): void => {
      store = signalState<ConfigureStoreState>({
        ...initialState,
        password: 'hunter2',
        passwordConfirmation: 'hunter2',
        selectedDatabasePath: databasePath,
        selectionOrigin: 'created'
      });
    });

    it('leaves the selection alone', (): void => {
      setConfigureState(store, configureState);

      expect(getState(store)).toEqual({
        ...initialState,
        configFileState: configureState.configFileState,
        knownDatabases: configureState.knownDatabases,
        logPath: configureState.logPath,
        password: 'hunter2',
        passwordConfirmation: 'hunter2',
        selectedDatabasePath: databasePath,
        selectionOrigin: 'created'
      });
    });
  });
});
