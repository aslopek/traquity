import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signal, WritableSignal} from '@angular/core';
import {signalState, SignalState} from '@ngrx/signals';
import {AuthState, KnownDatabase} from '../../../../bridge/startup-bridge.type';
import {DatabaseSelection} from '../../../startup/store/methods/select-database';
import {ConfigureStoreState, initialState} from '../configure.store';
import {authStateIn} from '../known-databases';
import {ContinuableStartupStore, continueStartup} from '../routing/continue-startup';
import {SelectionOrigin} from '../routing/next-startup-step';
import {discardAndStart} from './discard-and-start';

jest.mock('../known-databases', () => ({
  authStateIn: jest.fn()
}));

jest.mock('../routing/continue-startup', () => ({
  continueStartup: jest.fn()
}));

type AuthStateIn = (knownDatabases: KnownDatabase[], databasePath: string | null) => AuthState;
type ContinueStartup = (startupStore: ContinuableStartupStore, selection: DatabaseSelection, origin: SelectionOrigin,
                        definedPassword?: string) => void;

describe('discardAndStart', (): void => {
  const startedAgainst: string = 'C:\\Users\\x\\traquity';

  const arrangedKnownDatabases: KnownDatabase[] = [
    {
      path: startedAgainst,
      authState: 'scrypt'
    }
  ];

  let store: SignalState<ConfigureStoreState>;
  let databasePath: WritableSignal<string | null>;
  let authStateInMock: jest.Mock<AuthStateIn>;
  let continueStartupMock: jest.Mock<ContinueStartup>;
  let startupStore: ContinuableStartupStore & { databasePath: WritableSignal<string | null> };

  beforeEach((): void => {
    store = signalState<ConfigureStoreState>({...initialState, knownDatabases: arrangedKnownDatabases});
    databasePath = signal<string | null>(startedAgainst);
    startupStore = {
      databasePath,
      enterUnlock: jest.fn<() => void>(),
      selectDatabase: jest.fn<(selection: DatabaseSelection) => void>(),
      startBackend: jest.fn<(password: string) => void>()
    };

    authStateInMock = authStateIn as jest.Mock<AuthStateIn>;
    authStateInMock.mockReset();
    authStateInMock.mockReturnValue('scrypt');
    continueStartupMock = continueStartup as jest.Mock<ContinueStartup>;
    continueStartupMock.mockReset();
  });

  it('hands the started-against database over unchanged, without a password defined here', (): void => {
    discardAndStart(store, startupStore);

    expect(authStateInMock).toHaveBeenCalledTimes(1);
    expect(authStateInMock).toHaveBeenCalledWith(arrangedKnownDatabases, startedAgainst);
    expect(continueStartupMock).toHaveBeenCalledTimes(1);
    expect(continueStartupMock).toHaveBeenCalledWith(startupStore, {databasePath: startedAgainst, authState: 'scrypt'}, 'unchanged');
  });

  it('hands over the state the lookup reports for it', (): void => {
    authStateInMock.mockReturnValue('pending');

    discardAndStart(store, startupStore);

    expect(continueStartupMock).toHaveBeenCalledTimes(1);
    expect(continueStartupMock).toHaveBeenCalledWith(startupStore, {databasePath: startedAgainst, authState: 'pending'}, 'unchanged');
  });

  it('hands over the started-against database while the screen shows another one', (): void => {
    store = signalState<ConfigureStoreState>({
      ...store(),
      password: 'hunter2',
      selectedDatabasePath: 'D:\\backup\\traquity-new',
      selectionOrigin: 'created'
    });

    discardAndStart(store, startupStore);

    expect(authStateInMock).toHaveBeenCalledTimes(1);
    expect(authStateInMock).toHaveBeenCalledWith(arrangedKnownDatabases, startedAgainst);
    expect(continueStartupMock).toHaveBeenCalledTimes(1);
    expect(continueStartupMock).toHaveBeenCalledWith(startupStore, {databasePath: startedAgainst, authState: 'scrypt'}, 'unchanged');
  });

  it('continues nothing without a database to continue with', (): void => {
    databasePath.set(null);

    discardAndStart(store, startupStore);

    expect(authStateInMock).not.toHaveBeenCalled();
    expect(continueStartupMock).not.toHaveBeenCalled();
  });
});
