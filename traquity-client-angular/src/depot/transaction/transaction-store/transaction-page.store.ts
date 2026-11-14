import {ReadableSignalStore, WritableSignalStore} from '../../../common/types/signal-store.type';
import {signalStore, withComputed, withHooks, withMethods, withState} from '@ngrx/signals';
import {RxMethod} from '@ngrx/signals/rxjs-interop';
import {Store} from '@ngrx/store';
import {AppState} from '../../../store/app.state';
import {inject, Signal} from '@angular/core';
import {PaginatedTransactionRead, TransactionApi, TransactionRead, TransactionType} from '../../../gen/api/depot-transaction';
import {SecurityActions} from '../../../store/security/security.actions';
import {securityIdsByName as securityIdsByNameSelector} from '../../../store/security/security.selector';
import {selectedDepotIds} from '../../../store/depot/depot.selector';
import {allSecurityNames} from './computed/all-security-names';
import {loadPage} from './methods/load-page';
import {reloadFirstPage} from './methods/reload-first-page';
import {setFilteredTransactionTypes} from './methods/set-filtered-transaction-types';
import {setFilteredSecurityNames} from './methods/set-filtered-security-names';
import {replaceTransaction} from './methods/replace-transaction';
import {reloadOnDepotChange} from './effects/reload-on-depot-change';
import {updateTransaction, UpdateTransactionArgs} from './effects/update-transaction';
import {setEditedTransactionId} from './methods/set-edited-transaction-id';

export type TransactionPageComputed = {
  allSecurityNames: Signal<string[]>
  securityIdsByName: Signal<{ [securityName: string]: number }>
};

export type TransactionPageMethods = {
  loadPage: (page: number) => void
  reloadFirstPage: () => void
  replaceTransaction: (updated: TransactionRead) => void
  setEditedTransactionId: (editedTransactionId: number | null) => void
  setFilteredSecurityNames: (names: string[]) => void
  setFilteredTransactionTypes: (types: TransactionType[]) => void
  updateTransaction: (args: UpdateTransactionArgs) => void
};

export type TransactionPageState = {
  editedTransactionId: number | null
  filteredSecurityIds: number[] | null
  filteredTransactionTypes: TransactionType[]
  pageSize: number
  transactionPage: PaginatedTransactionRead
};

const pageSize: number = 10;
export const initialState: TransactionPageState = {
  editedTransactionId: null,
  filteredSecurityIds: null,
  filteredTransactionTypes: [
    TransactionType.BUY,
    TransactionType.SELL,
    TransactionType.DIVIDEND,
    TransactionType.SPECIAL_DIVIDEND,
    TransactionType.TAX
  ],
  pageSize,
  transactionPage: {
    total: 0,
    currentPage: 0,
    lastPage: 0,
    pageSize,
    items: []
  }
} as const;

export type ReadableTransactionPageStore = ReadableSignalStore<TransactionPageState, TransactionPageComputed, TransactionPageMethods>;

export const transactionPageStore = signalStore(
  withState(initialState),
  withComputed((signalStore: ReadableSignalStore<TransactionPageState>,
                globalStore: Store<AppState> = inject(Store)): TransactionPageComputed => {
    const securityIdsByName: Signal<{ [securityName: string]: number }> = globalStore.selectSignal(securityIdsByNameSelector);
    return {
      allSecurityNames: allSecurityNames(securityIdsByName),
      securityIdsByName
    };
  }),
  withMethods((signalStore: WritableSignalStore<TransactionPageState, TransactionPageComputed>,
               globalStore: Store<AppState> = inject(Store),
               transactionApi: TransactionApi = inject(TransactionApi)): TransactionPageMethods => {
    const updateTransactionMethod: RxMethod<UpdateTransactionArgs> = updateTransaction(signalStore, transactionApi, globalStore);
    return {
      loadPage: (page: number): void => loadPage(signalStore, globalStore, transactionApi, page),
      reloadFirstPage: (): void => reloadFirstPage(signalStore, globalStore, transactionApi),
      replaceTransaction: (updated: TransactionRead): void => replaceTransaction(signalStore, updated),
      setEditedTransactionId: (editedTransactionId: number | null): void => setEditedTransactionId(signalStore, editedTransactionId),
      setFilteredSecurityNames: (names: string[]): void => setFilteredSecurityNames(signalStore, globalStore, transactionApi, names),
      setFilteredTransactionTypes: (types: TransactionType[]): void => setFilteredTransactionTypes(signalStore, globalStore, transactionApi, types),
      updateTransaction: (args: UpdateTransactionArgs): void => {
        updateTransactionMethod(args);
      }
    };
  }),
  withHooks({
    onInit(signalStore: WritableSignalStore<TransactionPageState, TransactionPageComputed, TransactionPageMethods>): void {
      const globalStore: Store<AppState> = inject(Store);
      const transactionApi: TransactionApi = inject(TransactionApi);
      globalStore.dispatch(SecurityActions.loadAllSecurities());
      const depotIds: Signal<number[]> = globalStore.selectSignal(selectedDepotIds);
      const reloadOnDepotChangeFunction: RxMethod<number[]> = reloadOnDepotChange(signalStore, globalStore, transactionApi);
      reloadOnDepotChangeFunction(depotIds);
    }
  })
);
