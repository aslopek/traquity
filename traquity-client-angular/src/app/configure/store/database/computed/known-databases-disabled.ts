import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {ConfigureStoreState} from '../../configure.store';

export function knownDatabasesDisabled(signalStore: ReadableSignalStore<Pick<ConfigureStoreState, 'knownDatabases'>>): Signal<boolean> {
  return computed((): boolean => signalStore.knownDatabases().length === 0);
}
