import {Actions, ofType} from '@ngrx/effects';
import {filter, map, merge, Observable} from 'rxjs';
import {Action} from '@ngrx/store';
import {DepotActions} from '../depot.actions';
import {SecurityActions} from '../../security/security.actions';

export type ReloadDepotsOnEffectArgs = {
  actions$: Actions
};

/**
 * Listens for other domains' Done/Success actions whose changes affect the depot's derived data, rather than having those domains
 * dispatch DepotActions.reloadDepots() themselves. To add a trigger, add a branch to the `merge(...)` below that filters down to the
 * new action's success case - reloadDepots() itself takes no data, so no further normalization is needed.
 */
export function reloadDepotsOn(effectArgs: ReloadDepotsOnEffectArgs): Observable<Action> {
  const {actions$} = effectArgs;
  return merge(
    actions$.pipe(
      ofType(SecurityActions.updateHistoricalSecurityPriceConfigDone),
      filter(({historicalSecurityPriceConfig}): boolean => historicalSecurityPriceConfig !== undefined)
    )
  ).pipe(
    map((): Action => DepotActions.reloadDepots())
  );
}
