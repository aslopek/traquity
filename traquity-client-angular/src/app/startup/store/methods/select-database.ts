import {patchState} from "@ngrx/signals";
import {WritableSignalStore} from "../../../../common/types/signal-store.type";
import {AuthState} from "../../../../bridge/startup-bridge.type";
import {StartupComputed, StartupStoreState} from "../startup.store";

export type DatabaseSelection = {
  databasePath: string
  authState: AuthState
};

export function selectDatabase(signalStore: WritableSignalStore<StartupStoreState, StartupComputed>,
                               selection: DatabaseSelection): void {
  patchState(signalStore, {
    databasePath: selection.databasePath,
    authState: selection.authState
  });
}
