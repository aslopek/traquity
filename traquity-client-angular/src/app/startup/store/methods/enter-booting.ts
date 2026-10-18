import {Router} from '@angular/router';
import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {StartupComputed, StartupStoreState} from '../startup.store';

/**
 * Navigates back to the shell only when the phase was not already `booting`: entering the phase the app is already in
 * is a state change with nothing to navigate to, and navigating anyway would fire a redundant navigation on top of
 * the router's own initial one.
 */
export function enterBooting(signalStore: WritableSignalStore<StartupStoreState, StartupComputed>,
                             router: Pick<Router, 'navigate'>): void {
  const wasAlreadyBooting: boolean = signalStore.phase() === 'booting';
  patchState(signalStore, {phase: 'booting', startFailed: false}); // has to set startFailed to false whether or not it was already booting
  if (!wasAlreadyBooting) {
    router.navigate(['/']);
  }
}
