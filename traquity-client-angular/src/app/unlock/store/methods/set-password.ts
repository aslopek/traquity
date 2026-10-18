import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {UnlockState} from '../unlock.store';

/**
 * Clears the match synchronously: verification is debounced, so a stale `true` would otherwise keep OK enabled for
 * a few hundred milliseconds after a correct password is edited into a wrong one.
 */
export function setPassword(signalStore: WritableSignalStore<UnlockState>, password: string): void {
  patchState(signalStore, {password, passwordMatches: false});
}
