import {RxMethod, rxMethod} from '@ngrx/signals/rxjs-interop';
import {catchError, EMPTY, exhaustMap, map, Observable, pipe, tap} from 'rxjs';
import {patchState} from '@ngrx/signals';
import {Store} from '@ngrx/store';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {AppState} from '../../../../store/app.state';
import {DepotActions} from '../../../../store/depot/depot.actions';
import {NotificationActions} from '../../../../store/notification/notification.actions';
import {TransactionApi, TransactionRead, TransactionUpdate} from '../../../../gen/api/depot-transaction';
import {TransactionPageState} from '../transaction-page.store';
import {replaceTransaction} from '../methods/replace-transaction';

export type UpdateTransactionArgs = {
  depotId: number
  transactionId: number
  update: TransactionUpdate
};

export function updateTransaction(signalStore: WritableSignalStore<TransactionPageState>,
                                  api: Pick<TransactionApi, 'updateTransaction'>,
                                  globalStore: Store<AppState>): RxMethod<UpdateTransactionArgs> {
  return rxMethod<UpdateTransactionArgs>(updateTransactionPipe(signalStore, api, globalStore));
}

export function updateTransactionPipe(signalStore: WritableSignalStore<TransactionPageState>,
                                      api: Pick<TransactionApi, 'updateTransaction'>,
                                      globalStore: Store<AppState>): (source$: Observable<UpdateTransactionArgs>) => Observable<void> {
  return pipe(
    exhaustMap((args: UpdateTransactionArgs): Observable<void> =>
      api.updateTransaction(args.depotId, args.transactionId, args.update).pipe(
        tap((updated: TransactionRead): void => {
          replaceTransaction(signalStore, updated);
          patchState(signalStore, {editedTransactionId: null});
          globalStore.dispatch(DepotActions.reloadDepots());
        }),
        map((): void => undefined),
        catchError((): Observable<void> => {
          globalStore.dispatch(NotificationActions.addError({message: 'The transaction could not be saved.'}));
          return EMPTY;
        })
      ))
  );
}
