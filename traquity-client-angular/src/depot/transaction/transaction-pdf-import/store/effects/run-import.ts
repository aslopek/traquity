import {patchState} from "@ngrx/signals";
import {RxMethod, rxMethod} from "@ngrx/signals/rxjs-interop";
import {Store} from "@ngrx/store";
import {catchError, concat, concatMap, defer, EMPTY, finalize, from, map, Observable, OperatorFunction, pipe, switchMap, tap} from "rxjs";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {AppState} from "../../../../../store/app.state";
import {DepotActions} from "../../../../../store/depot/depot.actions";
import {SecurityActions} from "../../../../../store/security/security.actions";
import {SecuritiesByIsin} from "../../../../../store/security/selectors/get-securities-by-isin.selector";
import {SecurityApi, SecurityCreate, SecurityRead} from "../../../../../gen/api/security";
import {TransactionApi, TransactionCreate} from "../../../../../gen/api/depot-transaction";
import {ReadableTransactionPageStore} from "../../../transaction-store/transaction-page.store";
import {CollectedTransaction, TransactionPdfImportState} from "../transaction-pdf-import.type";
import {TransactionPdfImportComputed} from "../transaction-pdf-import.store";

export type RunImportArgs = {
  depotId: number
  securitiesByIsin: SecuritiesByIsin
};

type ImportStore = WritableSignalStore<TransactionPdfImportState, TransactionPdfImportComputed>;

export function runImport(signalStore: ImportStore, globalStore: Store<AppState>, securityApi: SecurityApi,
                          transactionApi: TransactionApi, transactionPageStore: ReadableTransactionPageStore): RxMethod<RunImportArgs> {
  return rxMethod<RunImportArgs>(runImportPipeline(signalStore, globalStore, securityApi, transactionApi, transactionPageStore));
}

export function runImportPipeline(signalStore: ImportStore, globalStore: Store<AppState>, securityApi: SecurityApi,
                                  transactionApi: TransactionApi,
                                  transactionPageStore: ReadableTransactionPageStore): OperatorFunction<RunImportArgs, void> {
  return pipe(
    switchMap((args: RunImportArgs): Observable<void> => {
      patchState(signalStore, {
        phase: "importing",
        importDone: 0,
        securitiesCreated: 0,
        transactionsCreated: 0,
        failedIsins: []
      });

      const idByIsin: Map<string, number> = new Map<string, number>();
      const newSecurityList: SecurityCreate[] = signalStore.newSecurities();

      return concat(
        from(newSecurityList).pipe(
          concatMap((security: SecurityCreate): Observable<void> => signalStore.cancelled()
            ? EMPTY
            : createSecurity(signalStore, globalStore, securityApi, security, idByIsin))
        ),
        defer((): Observable<void> => from(signalStore.collected()).pipe(
          concatMap((entry: CollectedTransaction): Observable<void> => signalStore.cancelled()
            ? EMPTY
            : importTransaction(signalStore, transactionApi, args, entry, idByIsin))
        ))
      ).pipe(finalize((): void => finish(signalStore, globalStore, transactionPageStore)));
    })
  );
}

function createSecurity(signalStore: ImportStore, globalStore: Store<AppState>, securityApi: SecurityApi,
                         security: SecurityCreate, idByIsin: Map<string, number>): Observable<void> {
  return securityApi.createSecurity(security).pipe(
    tap((created: SecurityRead): void => {
      globalStore.dispatch(SecurityActions.setSecurities({securities: [created]}));
      idByIsin.set(security.isin, created.id);
    }),
    map((): void => {
      patchState(signalStore, {
        importDone: signalStore.importDone() + 1,
        securitiesCreated: signalStore.securitiesCreated() + 1
      });
    }),
    catchError((): Observable<void> => {
      patchState(signalStore, {
        importDone: signalStore.importDone() + 1,
        failedIsins: [
          ...signalStore.failedIsins(),
          security.isin
        ]
      });
      return EMPTY;
    })
  );
}

function importTransaction(signalStore: ImportStore, transactionApi: TransactionApi, args: RunImportArgs,
                             entry: CollectedTransaction, idByIsin: Map<string, number>): Observable<void> {
  const securityId: number | undefined = idByIsin.get(entry.isin) ?? args.securitiesByIsin[entry.isin]?.id;
  if (securityId === undefined) {
    return defer((): Observable<never> => {
      patchState(signalStore, {importDone: signalStore.importDone() + 1});
      return EMPTY;
    });
  }

  const transactionCreate: TransactionCreate = {
    ...entry.draft,
    securityId
  };
  return transactionApi.createTransaction(args.depotId, transactionCreate).pipe(
    map((): void => {
      patchState(signalStore, {
        importDone: signalStore.importDone() + 1,
        transactionsCreated: signalStore.transactionsCreated() + 1
      });
    }),
    catchError((): Observable<void> => {
      patchState(signalStore, {
        importDone: signalStore.importDone() + 1
      });
      return EMPTY;
    })
  );
}

function finish(signalStore: ImportStore, globalStore: Store<AppState>, transactionPageStore: ReadableTransactionPageStore): void {
  patchState(signalStore, {phase: "imported"});
  globalStore.dispatch(DepotActions.reloadDepots());
  transactionPageStore.reloadFirstPage();
}
