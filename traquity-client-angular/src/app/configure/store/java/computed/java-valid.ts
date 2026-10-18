import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

export type JavaValidSlice = Pick<ConfigureStoreState, 'javaDownload' | 'javaVerification'>;

/** The section is complete once the current setting verifies and no download is in flight. */
export function javaValid(signalStore: ReadableSignalStore<JavaValidSlice>): Signal<boolean> {
  return computed((): boolean => signalStore.javaVerification()?.status === 'ok' && signalStore.javaDownload() == null);
}
