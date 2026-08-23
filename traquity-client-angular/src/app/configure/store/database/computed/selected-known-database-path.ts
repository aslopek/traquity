import {computed, Signal} from "@angular/core";
import {ReadableSignalStore} from "../../../../../common/types/signal-store.type";
import {AuthState} from "../../../../../bridge/startup-bridge.type";
import {ConfigureStoreState} from "../../configure.store";

/**
 * The selected path, narrowed to the selections the known-databases list contains: the path itself while the selection
 * is a known database, `null` while it is not.
 *
 * The narrowing reads the selection's auth state instead of searching the list a second time, because the two say the
 * same thing: every database in the list carries `passwordless` or `scrypt`, so `pending` is precisely the state of a
 * path the list does not contain - a file nothing is known about yet - and of no selection at all.
 */
export function selectedKnownDatabasePath(signalStore: ReadableSignalStore<Pick<ConfigureStoreState, 'selectedDatabasePath'>>,
                                          selectedAuthState: Signal<AuthState>): Signal<string | null> {
  return computed((): string | null => selectedAuthState() === 'pending' ? null : signalStore.selectedDatabasePath());
}
