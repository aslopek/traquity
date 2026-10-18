import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {ReadableStartupStore} from '../../../startup/store/startup.store';
import {UnlockState} from '../unlock.store';

export function canSubmit(signalStore: ReadableSignalStore<Pick<UnlockState, 'passwordMatches'>>,
                          startupStore: Pick<ReadableStartupStore, 'authState'>): Signal<boolean> {
  return computed((): boolean => startupStore.authState() !== 'scrypt' || signalStore.passwordMatches());
}
