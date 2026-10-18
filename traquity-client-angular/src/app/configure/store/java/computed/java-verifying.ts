import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

export type JavaVerifyingSlice = Pick<ConfigureStoreState, 'javaVerification'>;

/** `null` is the initial state, before the first `-version` run this section ever triggers has answered. */
export function javaVerifying(signalStore: ReadableSignalStore<JavaVerifyingSlice>): Signal<boolean> {
  return computed((): boolean => signalStore.javaVerification() == null);
}
