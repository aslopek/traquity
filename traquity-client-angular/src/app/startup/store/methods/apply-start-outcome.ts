import {Router} from '@angular/router';
import {patchState} from '@ngrx/signals';
import {Store} from '@ngrx/store';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {BackendStartOutcome} from '../../../../bridge/startup-bridge.type';
import {AppActions} from '../../../../store/app.actions';
import {AppState} from '../../../../store/app.state';
import {phaseAfterFailedStart, startupRouteFor} from '../routing/startup-route';
import {StartupComputed, StartupPhase, StartupStoreState} from '../startup.store';

/**
 * A reachable outcome initializes the global store. It doesn't change the phase and doesn't navigate. A failed start routes on the state it
 * was started from, and is the only thing that ever sets `startFailed`.
 */
export function applyStartOutcome(signalStore: WritableSignalStore<StartupStoreState, StartupComputed>,
                                  router: Pick<Router, 'navigate'>,
                                  globalStore: Store<AppState>,
                                  outcome: BackendStartOutcome): void {
  if (outcome.reachable) {
    globalStore.dispatch(AppActions.initialize());
    return;
  }

  const phase: StartupPhase = phaseAfterFailedStart(outcome.startedFrom);
  patchState(signalStore, {phase, startFailed: true});

  const route: string | null = startupRouteFor(phase);
  if (route != null) {
    router.navigate([route]);
  }
}
