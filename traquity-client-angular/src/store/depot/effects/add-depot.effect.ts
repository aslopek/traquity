import {Actions, ofType} from '@ngrx/effects';
import {DepotApi, DepotRead} from '../../../gen/api/depot';
import {catchError, concatMap, map, Observable, of} from 'rxjs';
import {Action} from '@ngrx/store';
import {AddDepotActionArgs, DepotActions} from '../depot.actions';

export type AddDepotEffectArgs = {
  actions$: Actions
  depotApi: DepotApi
};

export function addDepot(effectArgs: AddDepotEffectArgs): Observable<Action> {
  const {actions$, depotApi} = effectArgs;
  return actions$.pipe(
    ofType(DepotActions.addDepot),
    concatMap((actionArgs: AddDepotActionArgs): Observable<Action> => {
      const {depot} = actionArgs;
      return depotApi.createDepot(depot).pipe(
        map((result: DepotRead) => DepotActions.addDepotSuccess({
          depot: result
        })),
        catchError(() => of(DepotActions.addDepotError(actionArgs)))
      );
    })
  );
}
