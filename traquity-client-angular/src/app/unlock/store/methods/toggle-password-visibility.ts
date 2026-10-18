import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {UnlockState} from '../unlock.store';

export function togglePasswordVisibility(signalStore: WritableSignalStore<UnlockState>): void {
  patchState(signalStore, {passwordVisible: !signalStore.passwordVisible()});
}
