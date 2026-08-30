import {ReadableSignalStore} from "../../../../common/types/signal-store.type";
import {AuthState} from "../../../../bridge/startup-bridge.type";
import {ReadableStartupStore} from "../../../startup/store/startup.store";
import {ConfigureStoreState} from "../configure.store";
import {authStateIn} from "../known-databases";
import {ContinuableStartupStore, continueStartup} from "../routing/continue-startup";

export type DiscardAndStartSlice = Pick<ConfigureStoreState, 'knownDatabases'>;

/**
 * Discards pending changes made by the user and continues to start the application with the configuration as it was before those
 * changes were made. However, as discarded `auth` entries are persisted immediately, these changes will apply to the boot process.
 * This is intentional, since a password changed outside the app using h2 CLI tools can only be updated this way.
 */
export function discardAndStart(signalStore: ReadableSignalStore<DiscardAndStartSlice>,
                                startupStore: ContinuableStartupStore & Pick<ReadableStartupStore, 'databasePath'>): void {
  const databasePath: string | null = startupStore.databasePath();
  if (databasePath == null) {
    return;
  }

  const authState: AuthState = authStateIn(signalStore.knownDatabases(), databasePath);
  continueStartup(startupStore, {databasePath, authState}, 'unchanged');
}
