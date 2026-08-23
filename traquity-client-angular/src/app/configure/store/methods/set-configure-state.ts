import {patchState} from "@ngrx/signals";
import {WritableSignalStore} from "../../../../common/types/signal-store.type";
import {ConfigureState} from "../../../../bridge/startup-bridge.type";
import {ConfigureStoreState} from "../configure.store";

export function setConfigureState(signalStore: WritableSignalStore<ConfigureStoreState>,
                                  state: ConfigureState): void {
  patchState(signalStore, {
    configFileState: state.configFileState,
    knownDatabases: state.knownDatabases,
    logPath: state.logPath
  });
}
