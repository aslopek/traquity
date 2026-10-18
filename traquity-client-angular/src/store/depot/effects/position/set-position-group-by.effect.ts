import {Actions, ofType} from '@ngrx/effects';
import {ConfigApi} from '../../../../gen/api/configuration';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../../app.state';
import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {DepotActions, SetPositionGroupByActionArgs} from '../../depot.actions';
import {concatLatestFrom} from '@ngrx/operators';
import {PositionGroupBy} from '../../position-grouping/position-group.type';
import {positionGroupBy} from '../../depot.selector';
import {clientId} from '../../../client-id';
import {positionGroupBy as positionGroupByConfigKey} from '../../depot-config-keys';

export type SetPositionGroupByEffectArgs = {
  actions$: Actions
  configApi: ConfigApi
  store: Store<AppState>
};

export function setPositionGroupBy(effectArgs: SetPositionGroupByEffectArgs): Observable<Action> {
  const {actions$, configApi, store} = effectArgs;
  return actions$.pipe(
    ofType(DepotActions.setPositionGroupBy),
    concatLatestFrom((): Observable<PositionGroupBy> => store.select(positionGroupBy)),
    switchMap(([, groupBy]: [SetPositionGroupByActionArgs, PositionGroupBy]): Observable<Action> => {
      return configApi.setClientConfigValue(clientId, positionGroupByConfigKey.key, `${groupBy}`).pipe(
        map(() => DepotActions.setPositionGroupByDone({groupBy})),
        catchError(() => of(DepotActions.setPositionGroupByDone({groupBy})))
      )
    })
  );
}
