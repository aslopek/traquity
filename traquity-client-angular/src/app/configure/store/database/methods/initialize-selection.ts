import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

/**
 * Seeds the selection from the database the app started against, resetting the origin to `unchanged`: seeding is not
 * selecting, and a selection the user never made must not claim to be one.
 *
 * A first run has no such database, and none is proposed.
 */
export function initializeSelection(signalStore: WritableSignalStore<ConfigureStoreState>,
                                    databasePath: string | null): void {
  patchState(signalStore, {
    selectedDatabasePath: databasePath,
    selectionOrigin: 'unchanged'
  });
}
