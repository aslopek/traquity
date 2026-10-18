import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

/**
 * Adopts a not-yet-existing file. This is the one place in the app that produces the `created` origin, and with it
 * the only selection whose password is *defined* rather than proven.
 */
export function selectNewDatabase(signalStore: WritableSignalStore<ConfigureStoreState>,
                                  databasePath: string): void {
  patchState(signalStore, {
    selectedDatabasePath: databasePath,
    selectionOrigin: 'created',
    password: '',
    passwordConfirmation: ''
  });
}
