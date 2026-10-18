import {Router} from '@angular/router';
import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {startupRouteFor} from '../routing/startup-route';
import {StartupComputed, StartupStoreState} from '../startup.store';

export function enterConfigure(signalStore: WritableSignalStore<StartupStoreState, StartupComputed>,
                               router: Pick<Router, 'navigate'>): void {
  patchState(signalStore, {phase: 'configure', startFailed: false});
  const route: string | null = startupRouteFor('configure');
  if (route != null) {
    router.navigate([route]);
  }
}
