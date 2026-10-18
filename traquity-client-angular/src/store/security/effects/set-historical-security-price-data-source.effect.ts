import {Actions, ofType} from '@ngrx/effects';
import {
  HistoricalSecurityPriceDataSourceApi,
  HistoricalSecurityPriceDataSourceCreate,
  HistoricalSecurityPriceDataSourceRead,
  HistoricalSecurityPriceDataSourceUpdate
} from '../../../gen/api/historical-security-price';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../app.state';
import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {SecurityActions, SetHistoricalSecurityPriceDataSourceActionArgs} from '../security.actions';
import {concatLatestFrom} from '@ngrx/operators';
import {DataSourceWithId} from '../../../settings/data-source/data-source.type';
import {getHistoricalSecurityPriceDataSource} from '../security.selector';

export type SetHistoricalSecurityPriceDataSourceEffectArgs = {
  actions$: Actions
  api: HistoricalSecurityPriceDataSourceApi
  store: Store<AppState>
};

export function setHistoricalSecurityPriceDataSource(effectArgs: SetHistoricalSecurityPriceDataSourceEffectArgs): Observable<Action> {
  const {actions$, api, store} = effectArgs;
  return actions$.pipe(
    ofType(SecurityActions.setHistoricalSecurityPriceDataSource),
    concatLatestFrom((actionArgs: SetHistoricalSecurityPriceDataSourceActionArgs): Observable<DataSourceWithId | null> => {
      if (actionArgs.id === undefined) {
        return of(null);
      }
      return store.select(getHistoricalSecurityPriceDataSource(actionArgs.id));
    }),
    switchMap(([actionArgs, dataSource]: [SetHistoricalSecurityPriceDataSourceActionArgs, DataSourceWithId | null]): Observable<Action> => {
      if (dataSource == null) {
        const dataSourceCreate: HistoricalSecurityPriceDataSourceCreate = {
          ...actionArgs.dataSource,
          marketCloseTimes: actionArgs.dataSource.marketCloseTimes ?? []
        }
        return api.createHistoricalSecurityPriceDataSource(dataSourceCreate).pipe(
          map((response: HistoricalSecurityPriceDataSourceRead) => {
            return SecurityActions.setHistoricalSecurityPriceDataSourceDone({dataSource: response});
          }),
          catchError(() => of(SecurityActions.setHistoricalSecurityPriceDataSourceDone({})))
        );
      }

      const dataSourceUpdate: HistoricalSecurityPriceDataSourceUpdate = {
        ...actionArgs.dataSource,
        marketCloseTimes: actionArgs.dataSource.marketCloseTimes ?? [],
        version: dataSource.version
      };
      return api.updateHistoricalSecurityPriceDataSource(dataSource.id, dataSourceUpdate).pipe(
        map((response: HistoricalSecurityPriceDataSourceRead) => {
          return SecurityActions.setHistoricalSecurityPriceDataSourceDone({dataSource: response});
        }),
        catchError(() => of(SecurityActions.setHistoricalSecurityPriceDataSourceDone({})))
      )
    })
  );
}
