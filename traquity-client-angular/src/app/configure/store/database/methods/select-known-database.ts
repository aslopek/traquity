import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

/** Switching via the dropdown opens no dialog and asks for no password: the file exists and the app knows it does. */
export function selectKnownDatabase(signalStore: WritableSignalStore<ConfigureStoreState>,
                                    databasePath: string): void {
  patchState(signalStore, {
    selectedDatabasePath: databasePath,
    selectionOrigin: 'known',
    password: '',
    passwordConfirmation: ''
  });
}
