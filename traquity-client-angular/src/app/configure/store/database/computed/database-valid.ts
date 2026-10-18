import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

export type DatabaseValidSlice =
  Pick<ConfigureStoreState, 'password' | 'passwordConfirmation' | 'selectedDatabasePath' | 'selectionOrigin'>;

/**
 * Determines whether the entire database section is valid.
 */
export function databaseValid(signalStore: ReadableSignalStore<DatabaseValidSlice>): Signal<boolean> {
  return computed((): boolean => {
    if (signalStore.selectedDatabasePath() == null) {
      return false;
    }

    // the database is either not freshly created or the passwords defined for the fresh database match
    return signalStore.selectionOrigin() !== 'created'
      || signalStore.password() === signalStore.passwordConfirmation();
  });
}
