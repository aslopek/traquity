import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

export type PasswordlessWarningSlice = Pick<ConfigureStoreState, 'password' | 'passwordConfirmation'>;

export function passwordlessWarning(signalStore: ReadableSignalStore<PasswordlessWarningSlice>,
                                    definesPassword: Signal<boolean>): Signal<boolean> {
  return computed((): boolean =>
    definesPassword() && signalStore.password() === '' && signalStore.passwordConfirmation() === '');
}
