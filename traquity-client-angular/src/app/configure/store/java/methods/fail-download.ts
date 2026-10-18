import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

export function failDownload(signalStore: WritableSignalStore<ConfigureStoreState>, message: string): void {
  patchState(signalStore, {javaDownload: null, javaDownloadError: message});
}
