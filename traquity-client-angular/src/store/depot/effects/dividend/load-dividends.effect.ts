import {Actions, ofType} from '@ngrx/effects';
import {DividendApi, Dividends} from '../../../../gen/api/depot-dividend';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../../app.state';
import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {DepotActions, SetIncludeSpecialDividendsActionArgs} from '../../depot.actions';
import {concatLatestFrom} from '@ngrx/operators';
import {includeSpecialDividends, selectedDepotIds} from '../../depot.selector';

export type LoadDividendsEffectArgs = {
  actions$: Actions
  dividendApi: DividendApi
  store: Store<AppState>
};

export function loadDividends(effectArgs: LoadDividendsEffectArgs): Observable<Action> {
  const {actions$, dividendApi, store} = effectArgs;
  return actions$.pipe(
    ofType(DepotActions.setIncludeSpecialDividendsDone),
    concatLatestFrom((): [Observable<number[]>, Observable<boolean>] => [
      store.select(selectedDepotIds),
      store.select(includeSpecialDividends)
    ]),
    switchMap((([, depotIds, includeSpecialDividends]: [SetIncludeSpecialDividendsActionArgs, number[], boolean]): Observable<Action> => {
      return dividendApi.getDividends(depotIds, includeSpecialDividends).pipe(
        map((dividends: Dividends) => DepotActions.loadDividendsPositionsSuccess({
          dividends
        })),
        catchError(() => of(DepotActions.loadDividendsPositionsSuccess({})))
      )
    }))
  );
}
