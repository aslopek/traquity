import {inject} from '@angular/core';
import {CanActivateFn, Router, UrlTree} from '@angular/router';
import {startupRouteFor} from './store/routing/startup-route';
import {ReadableStartupStore, StartupStore} from './store/startup.store';

/**
 * Guards the shell route. The decision itself is `startupRouteFor`, which is pure and spec'd.
 */
export const startupPhaseGuard: CanActivateFn = (): boolean | UrlTree => {
  const store: ReadableStartupStore = inject(StartupStore);
  const route: string | null = startupRouteFor(store.phase());
  return route == null || inject(Router).createUrlTree([route]);
};
