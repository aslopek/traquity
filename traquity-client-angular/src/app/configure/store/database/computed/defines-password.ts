import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

/**
 * Whether the selected database is one whose password is being *defined*. A freshly created database needs a password, all other databases
 * have a password set up or are password-less.
 */
export function definesPassword(signalStore: ReadableSignalStore<Pick<ConfigureStoreState, 'selectionOrigin'>>): Signal<boolean> {
  return computed((): boolean => signalStore.selectionOrigin() === 'created');
}
