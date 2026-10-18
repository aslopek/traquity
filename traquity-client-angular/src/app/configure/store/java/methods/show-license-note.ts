import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

export function showLicenseNote(signalStore: WritableSignalStore<ConfigureStoreState>): void {
  patchState(signalStore, {licenseNoteVisible: true});
}
