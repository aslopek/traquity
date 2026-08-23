import {Router} from "@angular/router";
import {patchState} from "@ngrx/signals";
import {WritableSignalStore} from "../../../../common/types/signal-store.type";
import {BackendStartOutcome} from "../../../../bridge/startup-bridge.type";
import {phaseAfterFailedStart, startupRouteFor} from "../routing/startup-route";
import {StartupComputed, StartupPhase, StartupStoreState} from "../startup.store";

/**
 * On a reachable outcome this does nothing: the phase stays as it was and nothing is navigated, because a reachable
 * backend needs no startup routing at all. A failed start routes on the state it was started from, and is the only
 * thing that ever sets `startFailed`.
 */
export function applyStartOutcome(signalStore: WritableSignalStore<StartupStoreState, StartupComputed>,
                                  router: Pick<Router, 'navigate'>, outcome: BackendStartOutcome): void {
  if (outcome.reachable) {
    return;
  }

  const phase: StartupPhase = phaseAfterFailedStart(outcome.startedFrom);
  patchState(signalStore, {phase, startFailed: true});

  const route: string | null = startupRouteFor(phase);
  if (route != null) {
    router.navigate([route]);
  }
}
