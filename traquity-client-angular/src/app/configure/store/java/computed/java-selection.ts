import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

export type JavaSelection = 'automatic' | 'custom' | null;

export type JavaSelectionSlice = Pick<ConfigureStoreState, 'javaPath' | 'javaVerification'>;

export function javaSelection(signalStore: ReadableSignalStore<JavaSelectionSlice>): Signal<JavaSelection> {
  return computed((): JavaSelection => {
    if (signalStore.javaVerification()?.status !== 'ok') {
      return null;
    }
    return signalStore.javaPath() != null ? 'custom' : 'automatic';
  });
}
