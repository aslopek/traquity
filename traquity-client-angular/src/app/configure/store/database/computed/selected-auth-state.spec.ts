import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {AuthState, KnownDatabase} from '../../../../../bridge/startup-bridge.type';
import {authStateIn} from '../../known-databases';
import {selectedAuthState} from './selected-auth-state';

jest.mock('../../known-databases', () => ({
  authStateIn: jest.fn()
}));

type AuthStateIn = (knownDatabases: KnownDatabase[], databasePath: string | null) => AuthState;

describe('selectedAuthState', (): void => {
  const databasePath: string = 'C:\\Users\\x\\traquity';

  let arrangedKnownDatabases: KnownDatabase[];

  let knownDatabases: WritableSignal<KnownDatabase[]>;
  let selectedDatabasePath: WritableSignal<string | null>;
  let authStateInMock: jest.Mock<AuthStateIn>;

  beforeEach((): void => {
    arrangedKnownDatabases = [
      {
        path: databasePath,
        authState: 'scrypt'
      }
    ];
    knownDatabases = signal<KnownDatabase[]>(arrangedKnownDatabases);
    selectedDatabasePath = signal<string | null>(databasePath);

    authStateInMock = authStateIn as jest.Mock<AuthStateIn>;
    authStateInMock.mockReset();
    authStateInMock.mockReturnValue('scrypt');
  });

  it('passes known databases and selection to the helper function and returns its result', (): void => {
    const result: Signal<AuthState> = selectedAuthState({knownDatabases, selectedDatabasePath});

    expect(result()).toBe('scrypt');
    expect(authStateInMock).toHaveBeenCalledTimes(1);
    expect(authStateInMock).toHaveBeenCalledWith(arrangedKnownDatabases, databasePath);
  });
});
