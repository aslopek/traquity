import {RxMethod, rxMethod} from '@ngrx/signals/rxjs-interop';
import {catchError, EMPTY, Observable, pipe, switchMap, tap} from 'rxjs';
import {patchState} from '@ngrx/signals';
import {Store} from '@ngrx/store';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {DepotPerformanceComputed, DepotPerformanceState} from '../depot-performance.store';
import {HistoricalSecurityPrice, HistoricalSecurityPriceApi} from '../../../../gen/api/historical-security-price';
import {AppState} from '../../../../store/app.state';
import {NotificationActions} from '../../../../store/notification/notification.actions';

export type LoadBenchmarkPricesArgs = {
  securityId: number | null
  currency: string
};

/**
 * Writes the full price history of the given security in the given currency to `benchmarkPrices`. Without a security the prices
 * are cleared. A newer request drops the one in flight. A failed load clears the prices and raises an error notification.
 *
 * @param signalStore the store whose `benchmarkPrices` is written
 * @param globalStore receives error notifications, if any
 * @param historicalSecurityPriceApi delivers the prices
 * @returns the method to feed with the security and currency to load the prices for
 * @see loadBenchmarkPricesPipe
 */
export function loadBenchmarkPrices(signalStore: WritableSignalStore<DepotPerformanceState, DepotPerformanceComputed>,
                                    globalStore: Store<AppState>,
                                    historicalSecurityPriceApi: HistoricalSecurityPriceApi): RxMethod<LoadBenchmarkPricesArgs> {
  return rxMethod<LoadBenchmarkPricesArgs>(loadBenchmarkPricesPipe(signalStore, globalStore, historicalSecurityPriceApi));
}

export function loadBenchmarkPricesPipe(signalStore: WritableSignalStore<DepotPerformanceState, DepotPerformanceComputed>,
                                        globalStore: Store<AppState>,
                                        historicalSecurityPriceApi: HistoricalSecurityPriceApi):
  (source$: Observable<LoadBenchmarkPricesArgs>) => Observable<HistoricalSecurityPrice[]> {
  return pipe(
    switchMap((args: LoadBenchmarkPricesArgs): Observable<HistoricalSecurityPrice[]> => {
      if (args.securityId == null) {
        patchState(signalStore, {benchmarkPrices: []});
        return EMPTY;
      }

      return historicalSecurityPriceApi.getHistoricalSecurityPrices(args.securityId, undefined, args.currency).pipe(
        tap((benchmarkPrices: HistoricalSecurityPrice[]): void => patchState(signalStore, {benchmarkPrices})),
        catchError((): Observable<HistoricalSecurityPrice[]> => {
          patchState(signalStore, {benchmarkPrices: []});
          globalStore.dispatch(NotificationActions.addError({message: 'The historical prices could not be loaded.'}));
          return EMPTY;
        })
      );
    })
  );
}
