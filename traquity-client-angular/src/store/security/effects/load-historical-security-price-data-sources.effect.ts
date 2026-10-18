import {Actions, ofType} from '@ngrx/effects';
import {HistoricalSecurityPriceDataSourceApi, HistoricalSecurityPriceDataSourceRead} from '../../../gen/api/historical-security-price';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../app.state';
import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {SecurityActions} from '../security.actions';
import {AppActions} from '../../app.actions';

export type LoadHistoricalSecurityPriceDataSourcesEffectArgs = {
  actions$: Actions
  api: HistoricalSecurityPriceDataSourceApi
  store: Store<AppState>
};

export function loadHistoricalSecurityPriceDataSources(effectArgs: LoadHistoricalSecurityPriceDataSourcesEffectArgs): Observable<Action> {
  const {actions$, api, store} = effectArgs;
  return actions$.pipe(
    ofType(
      AppActions.initialize,
      SecurityActions.loadHistoricalSecurityPriceDataSources
    ),
    switchMap((): Observable<Action> => {
      return api.getHistoricalSecurityPriceDataSources().pipe(
        map((dataSources: HistoricalSecurityPriceDataSourceRead[]): Action => SecurityActions.loadHistoricalSecurityPriceDataSourcesDone({dataSources})),
        catchError((): Observable<Action> => of(SecurityActions.loadHistoricalSecurityPriceDataSourcesDone({dataSources: []})))
      )
    })
  );
}
