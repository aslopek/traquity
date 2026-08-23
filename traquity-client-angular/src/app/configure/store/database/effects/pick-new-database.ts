import {Signal} from "@angular/core";
import {RxMethod, rxMethod} from "@ngrx/signals/rxjs-interop";
import {exhaustMap, filter, Observable, pipe, tap} from "rxjs";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {StartupBridgeService} from "../../../../../bridge/startup-bridge.service";
import {PickedDatabase} from "../../../../../bridge/startup-bridge.type";
import {ConfigureStoreState} from "../../configure.store";
import {adoptPickedDatabase} from "../methods/adopt-picked-database";

/**
 * Opens the native dialog for picking a new database file and makes the picked file the selection.
 */
export function pickNewDatabase(signalStore: WritableSignalStore<ConfigureStoreState>,
                                bridge: Pick<StartupBridgeService, 'pickNewDatabase'>,
                                selectedDatabasePath: Signal<string | null>): RxMethod<void> {
  return rxMethod<void>(pickNewDatabasePipe(signalStore, bridge, selectedDatabasePath));
}

export function pickNewDatabasePipe(signalStore: WritableSignalStore<ConfigureStoreState>,
                                    bridge: Pick<StartupBridgeService, 'pickNewDatabase'>,
                                    selectedDatabasePath: Signal<string | null>):
  (source$: Observable<void>) => Observable<PickedDatabase> {
  return pipe(
    exhaustMap((): Observable<PickedDatabase | null> => bridge.pickNewDatabase(selectedDatabasePath())),
    filter((picked: PickedDatabase | null): picked is PickedDatabase => picked != null),
    tap((picked: PickedDatabase): void => adoptPickedDatabase(signalStore, picked))
  );
}
