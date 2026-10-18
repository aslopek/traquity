import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {UnlockState} from '../unlock.store';

export function setPasswordMatches(signalStore: WritableSignalStore<UnlockState>, passwordMatches: boolean): void {
  patchState(signalStore, {passwordMatches});
}
