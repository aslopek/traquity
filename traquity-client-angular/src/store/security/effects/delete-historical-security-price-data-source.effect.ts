import {Actions, ofType} from '@ngrx/effects';
import {HistoricalSecurityPriceDataSourceApi} from '../../../gen/api/historical-security-price';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../app.state';
import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {DeleteHistoricalSecurityPriceDataSourceActionArgs, SecurityActions} from '../security.actions';
import {concatLatestFrom} from '@ngrx/operators';
import {DataSourceWithId} from '../../../settings/data-source/data-source.type';
import {getHistoricalSecurityPriceDataSource} from '../security.selector';

export type DeleteHistoricalSecurityPriceDataSourceEffectArgs = {
  actions$: Actions
  api: HistoricalSecurityPriceDataSourceApi
  store: Store<AppState>
};

export function deleteHistoricalSecurityPriceDataSource(effectArgs: DeleteHistoricalSecurityPriceDataSourceEffectArgs): Observable<Action> {
  const {actions$, api, store} = effectArgs;
  return actions$.pipe(
    ofType(SecurityActions.deleteHistoricalSecurityPriceDataSource),
    concatLatestFrom((actionArgs: DeleteHistoricalSecurityPriceDataSourceActionArgs): Observable<DataSourceWithId | null> => {
      return store.select(getHistoricalSecurityPriceDataSource(actionArgs.id));
    }),
    switchMap(([, dataSource]: [DeleteHistoricalSecurityPriceDataSourceActionArgs, DataSourceWithId | null]): Observable<Action> => {
      if (dataSource === null) {
        return of(SecurityActions.deleteHistoricalSecurityPriceDataSourceDone({}));
      }
      return api.deleteHistoricalSecurityPriceDataSource(dataSource.id).pipe(
        map(() => SecurityActions.deleteHistoricalSecurityPriceDataSourceDone({id: dataSource.id})),
        catchError(() => of(SecurityActions.deleteHistoricalSecurityPriceDataSourceDone({})))
      );
    })
  );
}
