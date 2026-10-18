import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

/** One flag for both inputs: a password and its confirmation are compared by eye, so they are revealed together. */
export function togglePasswordVisibility(signalStore: WritableSignalStore<ConfigureStoreState>): void {
  patchState(signalStore, {passwordVisible: !signalStore.passwordVisible()});
}
