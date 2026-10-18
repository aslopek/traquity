import {Router} from '@angular/router';
import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {startupRouteFor} from '../routing/startup-route';
import {StartupComputed, StartupStoreState} from '../startup.store';

/**
 * The mirror image of `enterConfigure`, for the way back: a selection whose password can only be proven is handed to
 * the unlock screen. Touches no bridge, so no backend is spawned and no config file is written on the way.
 *
 * Clears `startFailed` for the same reason `enterConfigure` does: the flag belongs to the start attempt that set it,
 * and entering the unlock screen from here is the beginning of a fresh one, not the aftermath of a failed one.
 */
export function enterUnlock(signalStore: WritableSignalStore<StartupStoreState, StartupComputed>,
                            router: Pick<Router, 'navigate'>): void {
  patchState(signalStore, {phase: 'unlock', startFailed: false});
  const route: string | null = startupRouteFor('unlock');
  if (route != null) {
    router.navigate([route]);
  }
}
