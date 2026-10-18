import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

export type PasswordMismatchSlice = Pick<ConfigureStoreState, 'password' | 'passwordConfirmation'>;

export function passwordMismatch(signalStore: ReadableSignalStore<PasswordMismatchSlice>,
                                 definesPassword: Signal<boolean>): Signal<boolean> {
  return computed((): boolean => definesPassword() && signalStore.passwordConfirmation() !== signalStore.password());
}
