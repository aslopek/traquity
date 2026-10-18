import {Actions, ofType} from '@ngrx/effects';
import {ConfigApi} from '../../../../gen/api/configuration';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../../app.state';
import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {DepotActions, SetUsePositionBuyInValuesActionArgs} from '../../depot.actions';
import {concatLatestFrom} from '@ngrx/operators';
import {usePositionBuyInValues} from '../../depot.selector';
import {clientId} from '../../../client-id';
import {positionUseBuyIn} from '../../depot-config-keys';

export type SetUsePositionBuyInValuesEffectArgs = {
  actions$: Actions
  configApi: ConfigApi
  store: Store<AppState>
};

export function setUsePositionBuyInValues(effectArgs: SetUsePositionBuyInValuesEffectArgs): Observable<Action> {
  const {actions$, configApi, store} = effectArgs;
  return actions$.pipe(
    ofType(DepotActions.setUsePositionBuyInValues),
    concatLatestFrom((): Observable<boolean> => store.select(usePositionBuyInValues)),
    switchMap(([, useBuyInValues]: [SetUsePositionBuyInValuesActionArgs, boolean]): Observable<Action> => {
      return configApi.setClientConfigValue(clientId, positionUseBuyIn.key, `${useBuyInValues}`).pipe(
        map(() => DepotActions.setUsePositionBuyInValuesDone({useBuyInValues})),
        catchError(() => of(DepotActions.setUsePositionBuyInValuesDone({useBuyInValues})))
      );
    })
  );
}
