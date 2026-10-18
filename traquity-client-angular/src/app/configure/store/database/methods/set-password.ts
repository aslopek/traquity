import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

export function setPassword(signalStore: WritableSignalStore<ConfigureStoreState>,
                            password: string): void {
  patchState(signalStore, {password});
}
