import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {ReadableStartupStore} from '../../../startup/store/startup.store';
import {ConfigureStoreState} from '../configure.store';

/**
 * 'Discard & start' continues the startup with the config as it was, so it needs a config that was there and that
 * named a database:
 *
 * - a missing file is a true first run - there is nothing to continue with, and finishing the setup is the only way
 *   forward;
 * - an unreadable file could not be turned into a configuration at all, so continuing would mean continuing with
 *   defaults the user never chose;
 * - a config naming no database has nothing to continue *to*.
 *
 * However, an existing `databasePath` does not imply a usable database file exists at that location. So a successful
 * start cannot be guaranteed.
 */
export function enableDiscardAndStart(signalStore: ReadableSignalStore<Pick<ConfigureStoreState, 'configFileState'>>,
                                      startupStore: Pick<ReadableStartupStore, 'databasePath'>): Signal<boolean> {
  return computed((): boolean => signalStore.configFileState() === 'read' && startupStore.databasePath() != null);
}
