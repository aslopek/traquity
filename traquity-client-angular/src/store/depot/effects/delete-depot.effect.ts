import {DepotApi, DepotRead} from '../../../gen/api/depot';
import {Actions, ofType} from '@ngrx/effects';
import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {Action, Store} from '@ngrx/store';
import {DeleteDepotActionArgs, DepotActions} from '../depot.actions';
import {concatLatestFrom} from '@ngrx/operators';
import {depots} from '../depot.selector';
import {AppState} from '../../app.state';

export type DeleteDepotEffectArgs = {
  actions$: Actions
  depotApi: DepotApi
  store: Store<AppState>
}

export function deleteDepot(effectArgs: DeleteDepotEffectArgs): Observable<Action> {
  const {actions$, depotApi, store} = effectArgs;
  return actions$.pipe(
    ofType(DepotActions.deleteDepot),
    concatLatestFrom((): Observable<DepotRead[]> => store.select(depots)),
    switchMap(([actionArgs, depots]: [DeleteDepotActionArgs, DepotRead[]]): Observable<Action> => {
      const {depotId} = actionArgs;
      const depotExists: boolean = depots.findIndex((depot: DepotRead): boolean => depot.id === depotId) >= 0;

      if (depotExists) {
        return depotApi.deleteDepot(depotId).pipe(
          map(() => DepotActions.deleteDepotSuccess({depotId})),
          catchError(() => of(DepotActions.deleteDepotError({depotId})))
        );
      }
      return of(DepotActions.deleteDepotError({depotId}));
    })
  );
}
