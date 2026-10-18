import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

/**
 * Adopts a file that already exists. No password is defined for it: an existing file's password can only be proven,
 * never set from here.
 *
 * Both password fields are cleared, as in every selection change: a password typed for a database created a moment
 * ago must not survive the switch, or it would linger in state that no longer belongs to the current origin and
 * still travel on as this database's password.
 */
export function selectExistingDatabase(signalStore: WritableSignalStore<ConfigureStoreState>,
                                       databasePath: string): void {
  patchState(signalStore, {
    selectedDatabasePath: databasePath,
    selectionOrigin: 'picked',
    password: '',
    passwordConfirmation: ''
  });
}
