import {patchState} from "@ngrx/signals";
import {WritableSignalStore} from "../../../../common/types/signal-store.type";
import {StartupMode, StartupState} from "../../../../bridge/startup-bridge.type";
import {StartupComputed, StartupPhase, StartupStoreState} from "../startup.store";

export function setStartupState(signalStore: WritableSignalStore<StartupStoreState, StartupComputed>, state: StartupState): void {
  patchState(signalStore, {
    authState: state.authState,
    databasePath: state.databasePath,
    mode: state.mode,
    phase: phaseFor(state.mode)
  });
}

function phaseFor(mode: StartupMode): StartupPhase {
  return mode === 'boot' ? 'booting' : mode;
}
