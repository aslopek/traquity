import {Signal} from "@angular/core";
import {RxMethod, rxMethod} from "@ngrx/signals/rxjs-interop";
import {exhaustMap, filter, map, Observable, pipe, switchMap, tap} from "rxjs";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {StartupBridgeService} from "../../../../../bridge/startup-bridge.service";
import {ConfigureState} from "../../../../../bridge/startup-bridge.type";
import {ConfigureStoreState} from "../../configure.store";
import {setConfigureState} from "../../methods/set-configure-state";

export type ForgetPasswordBridge = Pick<StartupBridgeService, 'forgetPassword' | 'getConfigureState'>;

export function forgetPassword(signalStore: WritableSignalStore<ConfigureStoreState>,
                               bridge: ForgetPasswordBridge,
                               selectedDatabasePath: Signal<string | null>): RxMethod<void> {
  return rxMethod<void>(forgetPasswordPipe(signalStore, bridge, selectedDatabasePath));
}

/**
 * Discards the stored password record of the selected database and re-reads the configure state into the store.
 * The discard writes the config file immediately, so everything derived from `knownDatabases` would otherwise keep
 * describing a config that no longer exists. Re-reading it through the bridge rather than discarding the item in
 * the state leaves the single source of truth with the electron main process.
 */
export function forgetPasswordPipe(signalStore: WritableSignalStore<ConfigureStoreState>,
                                   bridge: ForgetPasswordBridge,
                                   selectedDatabasePath: Signal<string | null>):
  (source$: Observable<void>) => Observable<ConfigureState> {
  return pipe(
    map((): string | null => selectedDatabasePath()),
    filter((databasePath: string | null): databasePath is string => databasePath != null),
    exhaustMap((databasePath: string): Observable<ConfigureState> => bridge.forgetPassword(databasePath).pipe(
      switchMap((): Observable<ConfigureState> => bridge.getConfigureState())
    )),
    tap((state: ConfigureState): void => setConfigureState(signalStore, state))
  );
}
