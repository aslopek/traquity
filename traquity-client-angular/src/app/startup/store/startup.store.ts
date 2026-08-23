import {inject} from "@angular/core";
import {Router} from "@angular/router";
import {signalStore, withComputed, withMethods, withState} from "@ngrx/signals";
import {RxMethod} from "@ngrx/signals/rxjs-interop";
import {ReadableSignalStore, WritableSignalStore} from "../../../common/types/signal-store.type";
import {StartupBridgeService} from "../../../bridge/startup-bridge.service";
import {AuthState, StartupMode, StartupState} from "../../../bridge/startup-bridge.type";
import {startBackend} from "./effects/start-backend";
import {enterConfigure} from "./methods/enter-configure";
import {enterUnlock} from "./methods/enter-unlock";
import {DatabaseSelection, selectDatabase} from "./methods/select-database";
import {setStartupState} from "./methods/set-startup-state";

/** Where the app currently is, distinct from `mode` (what the main process computed at start - see below). */
export type StartupPhase = 'booting' | 'configure' | 'insecure' | 'unlock';

export type StartupComputed = {};

export type StartupMethods = {
  enterConfigure: () => void
  enterUnlock: () => void
  selectDatabase: (selection: DatabaseSelection) => void
  setStartupState: (state: StartupState) => void
  startBackend: (password: string) => void
};

export type StartupStoreState = {
  authState: AuthState | null
  databasePath: string | null
  // null means no bridge (`ng serve` in a browser)
  mode: StartupMode | null
  phase: StartupPhase
  startFailed: boolean
};

export const initialState: StartupStoreState = {
  authState: null,
  databasePath: null,
  mode: null,
  phase: 'booting',
  startFailed: false
} as const;

export type ReadableStartupStore = ReadableSignalStore<StartupStoreState, StartupComputed, StartupMethods>;

export const StartupStore = signalStore(
  {providedIn: "root"},
  withState(initialState),
  withComputed((): StartupComputed => ({})),
  withMethods((signalStore: WritableSignalStore<StartupStoreState, StartupComputed>,
               bridge: StartupBridgeService = inject(StartupBridgeService),
               router: Router = inject(Router)): StartupMethods => {
    const startBackendMethod: RxMethod<string> = startBackend(signalStore, bridge, router);
    return {
      enterConfigure: (): void => enterConfigure(signalStore, router),
      enterUnlock: (): void => enterUnlock(signalStore, router),
      selectDatabase: (selection: DatabaseSelection): void => selectDatabase(signalStore, selection),
      setStartupState: (state: StartupState): void => setStartupState(signalStore, state),
      startBackend: startBackendMethod
    };
  })
);
