import {Action, Store} from '@ngrx/store';
import {AppState} from '../../app.state';
import {Actions, ofType} from '@ngrx/effects';
import {DividendApi, Dividends} from '../../../gen/api/depot-dividend';
import {catchError, forkJoin, map, Observable, of, switchMap} from 'rxjs';
import {ActionsTriggeringPerformanceDataReload, DepotActions} from '../depot.actions';
import {concatLatestFrom} from '@ngrx/operators';
import {includeSpecialDividends, selectedDepotIds} from '../depot.selector';
import {DepotComposition, DepotPositionApi} from '../../../gen/api/depot-position';
import {DepotPerformanceIncomeApi, IncomeType, Performance} from '../../../gen/api/depot-performance';

export type LoadDividendsPositionsEffectArgs = {
  actions$: Actions
  depotPerformanceIncomeApi: DepotPerformanceIncomeApi
  depotPositionApi: DepotPositionApi
  dividendApi: DividendApi
  store: Store<AppState>
}

type DividendsPositions = {
  depotIds: number[]
  dividends: Dividends | null
  positions: DepotComposition | null
};

type DividendsPositionsIncome = DividendsPositions & {
  income: Performance[]
};

export function loadDividendsPositions(effectArgs: LoadDividendsPositionsEffectArgs): Observable<Action> {
  const {actions$, depotPerformanceIncomeApi, depotPositionApi, dividendApi, store} = effectArgs;
  return actions$.pipe(
    ofType(...ActionsTriggeringPerformanceDataReload),
    concatLatestFrom((): [Observable<number[]>, Observable<boolean>] => [
      store.select(selectedDepotIds),
      store.select(includeSpecialDividends)
    ]),
    switchMap(([, depotIds, includeSpecialDividends]: [unknown, number[], boolean]): Observable<DividendsPositions> => {
      const dividends: Observable<Dividends | null> = dividendApi.getDividends(depotIds, includeSpecialDividends).pipe(
        map((dividends: Dividends): Dividends => dividends),
        catchError((_error: unknown): Observable<null> => of(null))
      );

      const positions: Observable<DepotComposition | null> = depotPositionApi.getDepotPositions(depotIds).pipe(
        map((depotComposition: DepotComposition): DepotComposition => depotComposition),
        catchError((_error: unknown): Observable<null> => of(null))
      );

      return forkJoin([dividends, positions]).pipe(
        map(([dividends, positions]): DividendsPositions => {
          return {
            depotIds,
            dividends,
            positions
          } satisfies DividendsPositions
        }),
        catchError((): Observable<DividendsPositions> => of({
          depotIds,
          dividends: null,
          positions: null
        }))
      );
    }),
    switchMap((v: DividendsPositions): Observable<DividendsPositionsIncome> => {
      if (v.positions == null) {
        return of({
          ...v,
          income: []
        } satisfies DividendsPositionsIncome);
      }

      const securityIds: number[] = [];
      for (const position of v.positions.positions) {
        securityIds.push(...position.securityIds);
      }
      const performance$: Observable<Performance[]> = depotPerformanceIncomeApi.getIncome(v.depotIds, securityIds, [IncomeType.DIVIDEND, IncomeType.OTHER]);
      return performance$.pipe(
        map((income: Performance[]): DividendsPositionsIncome => {
          return {
            depotIds: v.depotIds,
            dividends: v.dividends,
            positions: v.positions,
            income
          }
        }),
        catchError((): Observable<DividendsPositionsIncome> => of({
          ...v,
          income: []
        }))
      );
    }),
    switchMap((v: DividendsPositionsIncome): Observable<Action> => {
      return of(DepotActions.loadDividendsPositionsSuccess({
        dividends: v.dividends,
        positions: v.positions,
        income: v.income
      }));
    })
  );
}
