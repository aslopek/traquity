import {Actions, ofType} from '@ngrx/effects';
import {ConfigApi} from '../../../../gen/api/configuration';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../../app.state';
import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {dividendUseGrossValues as dividendUseGrossValuesConfigKey} from '../../depot-config-keys';
import {useDividendGrossValues as useDividendGrossValuesSelector} from '../../depot.selector';
import {clientId} from '../../../client-id';
import {DepotActions, SetUseDividendGrossValuesActionArgs} from '../../depot.actions';
import {concatLatestFrom} from '@ngrx/operators';

export type UseDividendGrossValuesEffectArgs = {
  actions$: Actions
  configApi: ConfigApi
  store: Store<AppState>
};

export function setUseDividendGrossValues(effectArgs: UseDividendGrossValuesEffectArgs): Observable<Action> {
  const {actions$, configApi, store} = effectArgs;
  return actions$.pipe(
    ofType(DepotActions.setUseDividendGrossValues),
    concatLatestFrom((): Observable<boolean> => store.select(useDividendGrossValuesSelector)),
    switchMap(([, useGrossValues]: [SetUseDividendGrossValuesActionArgs, boolean]): Observable<Action> => {
      return configApi.setClientConfigValue(clientId, dividendUseGrossValuesConfigKey.key, `${useGrossValues}`).pipe(
        map(() => DepotActions.setUseDividendGrossValuesDone({useGrossValues})),
        catchError(() => of(DepotActions.setUseDividendGrossValuesDone({useGrossValues})))
      );
    })
  );
}
