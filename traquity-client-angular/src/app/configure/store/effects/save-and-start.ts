import {Signal} from "@angular/core";
import {RxMethod, rxMethod} from "@ngrx/signals/rxjs-interop";
import {exhaustMap, filter, map, Observable, pipe, tap} from "rxjs";
import {ReadableSignalStore} from "../../../../common/types/signal-store.type";
import {StartupBridgeService} from "../../../../bridge/startup-bridge.service";
import {AppliedConfiguration, ConfigurationChanges} from "../../../../bridge/startup-bridge.type";
import {ConfigureStoreState} from "../configure.store";
import {ContinuableStartupStore, continueStartup} from "../routing/continue-startup";

export type SaveAndStartSlice = Pick<ConfigureStoreState, 'password' | 'selectionOrigin'>;

export function saveAndStart(signalStore: ReadableSignalStore<SaveAndStartSlice>,
                             bridge: Pick<StartupBridgeService, 'applyConfiguration'>,
                             startupStore: ContinuableStartupStore,
                             selectedDatabasePath: Signal<string | null>,
                             javaPath: Signal<string | null>,
                             javaSignature: Signal<string | null>): RxMethod<void> {
  return rxMethod<void>(saveAndStartPipe(signalStore, bridge, startupStore, selectedDatabasePath, javaPath, javaSignature));
}

/**
 * The frame's finish: every section's changes are persisted in one config write, and the startup continues from
 * whatever that write reports about the selected database. The `map` building the changes is where a further section
 * contributes its own slice of them.
 *
 * The changes are assembled when the effect runs rather than handed in: `filter`, so a trigger with nothing selected
 * writes nothing at all rather than needing a branch to say so; `exhaustMap`, so a further trigger while the write is
 * in flight is dropped rather than queued.
 */
export function saveAndStartPipe(signalStore: ReadableSignalStore<SaveAndStartSlice>,
                                 bridge: Pick<StartupBridgeService, 'applyConfiguration'>,
                                 startupStore: ContinuableStartupStore,
                                 selectedDatabasePath: Signal<string | null>,
                                 javaPath: Signal<string | null>,
                                 javaSignature: Signal<string | null>):
  (source$: Observable<void>) => Observable<AppliedConfiguration> {
  return pipe(
    map((): string | null => selectedDatabasePath()),
    filter((databasePath: string | null): databasePath is string => databasePath != null),
    map((databasePath: string): ConfigurationChanges => ({databasePath, javaPath: javaPath(), javaSignature: javaSignature()})),
    exhaustMap((changes: ConfigurationChanges): Observable<AppliedConfiguration> =>
      bridge.applyConfiguration(changes)),
    tap((applied: AppliedConfiguration): void => continueStartup(
      startupStore,
      {
        databasePath: applied.databasePath,
        authState: applied.authState
      },
      signalStore.selectionOrigin(),
      signalStore.password()
    ))
  );
}
