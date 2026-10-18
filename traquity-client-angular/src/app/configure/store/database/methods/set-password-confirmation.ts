import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

export function setPasswordConfirmation(signalStore: WritableSignalStore<ConfigureStoreState>,
                                        passwordConfirmation: string): void {
  patchState(signalStore, {passwordConfirmation});
}
