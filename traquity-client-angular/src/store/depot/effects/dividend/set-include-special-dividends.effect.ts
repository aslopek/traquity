import {Actions, ofType} from '@ngrx/effects';
import {ConfigApi} from '../../../../gen/api/configuration';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../../app.state';
import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {DepotActions, SetIncludeSpecialDividendsActionArgs} from '../../depot.actions';
import {concatLatestFrom} from '@ngrx/operators';
import {dividendIncludeSpecialDividends as includeSpecialDividendsConfigKey} from '../../depot-config-keys';
import {includeSpecialDividends as includeSpecialDividendsSelector} from '../../depot.selector';
import {clientId} from '../../../client-id';

export type IncludeSpecialDividendsEffectArgs = {
  actions$: Actions
  configApi: ConfigApi
  store: Store<AppState>
};

export function setIncludeSpecialDividends(effectArgs: IncludeSpecialDividendsEffectArgs): Observable<Action> {
  const {actions$, configApi, store} = effectArgs;
  return actions$.pipe(
    ofType(DepotActions.setIncludeSpecialDividends),
    concatLatestFrom((): Observable<boolean> => store.select(includeSpecialDividendsSelector)),
    switchMap(([, includeSpecialDividendsInState]: [SetIncludeSpecialDividendsActionArgs, boolean]): Observable<Action> => {
      return configApi.setClientConfigValue(clientId, includeSpecialDividendsConfigKey.key, `${includeSpecialDividendsInState}`).pipe(
        map(() => DepotActions.setIncludeSpecialDividendsDone({includeSpecialDividends: includeSpecialDividendsInState})),
        catchError(() => of(DepotActions.setIncludeSpecialDividendsDone({includeSpecialDividends: includeSpecialDividendsInState})))
      )
    })
  );
}
