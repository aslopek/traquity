import {Router} from "@angular/router";
import {RxMethod, rxMethod} from "@ngrx/signals/rxjs-interop";
import {catchError, EMPTY, exhaustMap, Observable, pipe, tap} from "rxjs";
import {WritableSignalStore} from "../../../../common/types/signal-store.type";
import {StartupBridgeService} from "../../../../bridge/startup-bridge.service";
import {BackendStartOutcome} from "../../../../bridge/startup-bridge.type";
import {applyStartOutcome} from "../methods/apply-start-outcome";
import {enterBooting} from "../methods/enter-booting";
import {StartupComputed, StartupStoreState} from "../startup.store";

export function startBackend(signalStore: WritableSignalStore<StartupStoreState, StartupComputed>,
                             bridge: Pick<StartupBridgeService, 'startBackend'>,
                             router: Pick<Router, 'navigate'>): RxMethod<string> {
  return rxMethod<string>(startBackendPipe(signalStore, bridge, router));
}

export function startBackendPipe(signalStore: WritableSignalStore<StartupStoreState, StartupComputed>,
                                 bridge: Pick<StartupBridgeService, 'startBackend'>,
                                 router: Pick<Router, 'navigate'>):
  (source$: Observable<string>) => Observable<BackendStartOutcome> {
  return pipe(
    tap((): void => enterBooting(signalStore, router)),
    // exhaustMap mirrors the main process's own single-instance guard: a second call while one is in flight is
    // dropped rather than queued
    exhaustMap((password: string): Observable<BackendStartOutcome> => bridge.startBackend(password).pipe(
      catchError((_error: unknown): Observable<never> => {
        return EMPTY;
      })
    )),
    tap((outcome: BackendStartOutcome): void => applyStartOutcome(signalStore, router, outcome))
  );
}
