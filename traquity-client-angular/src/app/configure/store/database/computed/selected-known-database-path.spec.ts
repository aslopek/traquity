import {beforeEach, describe, expect, it} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {AuthState} from '../../../../../bridge/startup-bridge.type';
import {selectedKnownDatabasePath} from './selected-known-database-path';

describe('selectedKnownDatabasePath', (): void => {
  const databasePath: string = 'C:\\Users\\x\\traquity';

  let selectedDatabasePath: WritableSignal<string | null>;
  let selectedAuthState: WritableSignal<AuthState>;

  beforeEach((): void => {
    selectedDatabasePath = signal<string | null>(databasePath);
    selectedAuthState = signal<AuthState>('scrypt');
  });

  it.each(['passwordless', 'scrypt'] satisfies AuthState[])('yields the path of a selection for authState = %s',
    (authState: AuthState): void => {
      selectedAuthState.set(authState);

      const result: Signal<string | null> = selectedKnownDatabasePath({selectedDatabasePath}, selectedAuthState);

      expect(result()).toBe(databasePath);
    });

  describe('for a pending selection', (): void => {
    beforeEach((): void => {
      selectedAuthState.set('pending');
    });

    it('yields null', (): void => {
      const result: Signal<string | null> = selectedKnownDatabasePath({selectedDatabasePath}, selectedAuthState);

      expect(result()).toBeNull();
    });

    it('yields null while no database is selected', (): void => {
      selectedDatabasePath.set(null);

      const result: Signal<string | null> = selectedKnownDatabasePath({selectedDatabasePath}, selectedAuthState);

      expect(result()).toBeNull();
    });
  });
});
