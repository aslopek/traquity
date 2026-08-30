import {Signal} from "@angular/core";
import {RxMethod, rxMethod} from "@ngrx/signals/rxjs-interop";
import {exhaustMap, filter, Observable, pipe, tap} from "rxjs";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {StartupBridgeService} from "../../../../../bridge/startup-bridge.service";
import {ConfigureStoreState} from "../../configure.store";
import {selectExistingDatabase} from "../methods/select-existing-database";

export function pickExistingDatabase(signalStore: WritableSignalStore<ConfigureStoreState>,
                                     bridge: Pick<StartupBridgeService, 'pickExistingDatabase'>,
                                     selectedDatabasePath: Signal<string | null>): RxMethod<void> {
  return rxMethod<void>(pickExistingDatabasePipe(signalStore, bridge, selectedDatabasePath));
}

/**
 * Opens the native dialog for picking an existing database file and makes the picked file the selection.
 */
export function pickExistingDatabasePipe(signalStore: WritableSignalStore<ConfigureStoreState>,
                                         bridge: Pick<StartupBridgeService, 'pickExistingDatabase'>,
                                         selectedDatabasePath: Signal<string | null>):
  (source$: Observable<void>) => Observable<string> {
  return pipe(
    exhaustMap((): Observable<string | null> => bridge.pickExistingDatabase(selectedDatabasePath())),
    filter((databasePath: string | null): databasePath is string => databasePath != null),
    tap((databasePath: string): void => selectExistingDatabase(signalStore, databasePath))
  );
}
