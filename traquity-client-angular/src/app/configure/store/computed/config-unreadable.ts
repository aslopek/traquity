import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../configure.store';

/** Whether the app fell back to a default configuration because it could not read the file on disk. */
export function configUnreadable(signalStore: ReadableSignalStore<Pick<ConfigureStoreState, 'configFileState'>>): Signal<boolean> {
  return computed((): boolean => signalStore.configFileState() === 'unreadable');
}
