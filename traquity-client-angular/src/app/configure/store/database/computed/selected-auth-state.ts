import {computed, Signal} from "@angular/core";
import {ReadableSignalStore} from "../../../../../common/types/signal-store.type";
import {AuthState} from "../../../../../bridge/startup-bridge.type";
import {ConfigureStoreState} from "../../configure.store";
import {authStateIn} from "../../known-databases";

export type SelectedAuthStateSlice = Pick<ConfigureStoreState, 'knownDatabases' | 'selectedDatabasePath'>;

export function selectedAuthState(signalStore: ReadableSignalStore<SelectedAuthStateSlice>): Signal<AuthState> {
  return computed((): AuthState => authStateIn(signalStore.knownDatabases(), signalStore.selectedDatabasePath()));
}
