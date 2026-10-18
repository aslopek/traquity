import {RxMethod, rxMethod} from '@ngrx/signals/rxjs-interop';
import {catchError, EMPTY, expand, forkJoin, map, Observable, of, pipe, reduce, switchMap, tap} from 'rxjs';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {DepotPerformanceComputed, DepotPerformanceState} from '../depot-performance.store';
import {PaginatedTransactionRead, SortOrder, TransactionApi, TransactionRead} from '../../../../gen/api/depot-transaction';
import {sortTransactions} from '../../../../common/functions/sort-transactions';
import {patchState} from '@ngrx/signals';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../store/app.state';
import {SecurityActions} from '../../../../store/security/security.actions';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';

export type LoadTransactionsArgs = {
  depotIds: number[]
  depotValues: RebasedDepotValue[]
}

function fetchDepotTransactions(transactionApi: TransactionApi, depotId: number, pageSize: number,
                                startDate: string): Observable<TransactionRead[]> {
  const firstPage: Observable<PaginatedTransactionRead> =
    transactionApi.getTransactions(depotId, 0, pageSize, SortOrder.ASC, undefined, startDate);

  return firstPage.pipe(
    expand((page: PaginatedTransactionRead): Observable<PaginatedTransactionRead> => {
      if (page.currentPage < page.lastPage) {
        return transactionApi.getTransactions(depotId, page.currentPage + 1, pageSize, SortOrder.ASC, undefined, startDate);
      } else {
        return EMPTY;
      }
    }),
    map((page: PaginatedTransactionRead): TransactionRead[] => page.items),
    reduce((accumulated: TransactionRead[], pageItems: TransactionRead[]): TransactionRead[] =>
      [...accumulated, ...pageItems], [] satisfies TransactionRead[])
  );
}

export function loadTransactions(signalStore: WritableSignalStore<DepotPerformanceState, DepotPerformanceComputed>,
                                 globalStore: Store<AppState>,
                                 transactionApi: TransactionApi): RxMethod<LoadTransactionsArgs> {
  const pageSize: number = 1000;
  return rxMethod<LoadTransactionsArgs>(
    pipe(
      switchMap((args: LoadTransactionsArgs): Observable<void> => {
        const {depotIds, depotValues} = args;
        if (depotValues.length === 0) {
          patchState(signalStore, {transactions: []});
          return EMPTY;
        }

        const minDate: string = depotValues[0].date;
        const depotTransactions$: Observable<TransactionRead[]>[] = depotIds.map((depotId: number): Observable<TransactionRead[]> =>
          fetchDepotTransactions(transactionApi, depotId, pageSize, minDate));
        const allTransactions$: Observable<TransactionRead[][]> =
          depotTransactions$.length === 0 ? of([]) : forkJoin(depotTransactions$);

        return allTransactions$.pipe(
          map((perDepot: TransactionRead[][]): TransactionRead[] => perDepot.flat()),
          tap((transactions: TransactionRead[]): void => {
            sortTransactions(transactions);
            transactions.reverse();
            patchState(signalStore, {transactions});

            const securityIds: Set<number> = new Set<number>();
            for (const transaction of transactions) {
              securityIds.add(transaction.securityId);
            }
            for (const securityId of securityIds) {
              globalStore.dispatch(SecurityActions.loadSecurity({securityId}));
            }
          }),
          map((): void => undefined), // typesafety: discard array so that void can be returned
          catchError((): Observable<void> => {
            patchState(signalStore, {transactions: []});
            return EMPTY;
          })
        );
      })
    )
  )
}
