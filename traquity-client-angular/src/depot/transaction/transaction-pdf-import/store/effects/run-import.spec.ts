import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signal, WritableSignal} from '@angular/core';
import {patchState, signalState, SignalState} from '@ngrx/signals';
import {Store} from '@ngrx/store';
import {Observable, of, throwError} from 'rxjs';
import {AppState} from '../../../../../store/app.state';
import {DepotActions} from '../../../../../store/depot/depot.actions';
import {SecurityActions} from '../../../../../store/security/security.actions';
import {SecuritiesByIsin} from '../../../../../store/security/selectors/get-securities-by-isin.selector';
import {SecurityApi, SecurityCreate, SecurityRead, SecurityType, StockSplit, StockSplitApi} from '../../../../../gen/api/security';
import {TransactionApi, TransactionCreate, TransactionRead} from '../../../../../gen/api/depot-transaction';
import {ReadableTransactionPageStore} from '../../../transaction-store/transaction-page.store';
import {collectedTransactionFactory} from '../../../../../testing/collected-transaction.factory';
import {securityReadFactory} from '../../../../../testing/security-read.factory';
import {stockSplitFactory} from '../../../../../testing/stock-split.factory';
import {TransactionPdfImportComputed} from '../transaction-pdf-import.store';
import {CollectedTransaction, initialState, TransactionPdfImportState} from '../transaction-pdf-import.type';
import {RunImportArgs, runImportPipeline} from './run-import';

type ImportStore = SignalState<TransactionPdfImportState> & TransactionPdfImportComputed;
type CreateSecurity = (security: SecurityCreate) => Observable<SecurityRead>;
type CreateTransaction = (depotId: number, body: TransactionCreate) => Observable<TransactionRead>;
type GetStockSplits = (id: number) => Observable<StockSplit[]>;

describe('runImportPipeline', (): void => {
  const okIsin: string = 'US0378331005';
  const failingIsin: string = 'DE0007236101';

  let store: ImportStore;
  let newSecuritiesSignal: WritableSignal<SecurityCreate[]>;
  let collected: CollectedTransaction[];
  let created: SecurityRead;
  let args: RunImportArgs;
  let calls: string[];
  let createSecurity: jest.Mock<CreateSecurity>;
  let createTransaction: jest.Mock<CreateTransaction>;
  let getStockSplits: jest.Mock<GetStockSplits>;
  let securityApi: SecurityApi;
  let transactionApi: TransactionApi;
  let stockSplitApi: StockSplitApi;
  let dispatch: jest.Mock<(action: unknown) => void>;
  let globalStore: Store<AppState>;
  let reloadFirstPage: jest.Mock<() => void>;
  let transactionPageStore: ReadableTransactionPageStore;

  function run(): Promise<void> {
    return new Promise<void>((resolve): void => {
      of(args)
        .pipe(runImportPipeline(store, globalStore, securityApi, transactionApi, stockSplitApi, transactionPageStore))
        .subscribe({complete: (): void => resolve()});
    });
  }

  beforeEach((): void => {
    collected = [
      collectedTransactionFactory({isin: okIsin, path: '/a.pdf'}),
      collectedTransactionFactory({isin: okIsin, path: '/b.pdf'}),
      collectedTransactionFactory({isin: failingIsin, path: '/c.pdf'})
    ];
    created = securityReadFactory({isin: okIsin, id: 42});

    const baseState: SignalState<TransactionPdfImportState> =
      signalState<TransactionPdfImportState>({...initialState, collected});
    newSecuritiesSignal = signal<SecurityCreate[]>([
      {isin: okIsin, name: 'Apple Inc.', symbols: [], securityType: SecurityType.STOCK},
      {isin: failingIsin, name: 'Siemens AG', symbols: [], securityType: SecurityType.STOCK}
    ]);
    store = Object.assign(baseState, {newSecurities: newSecuritiesSignal}) as unknown as ImportStore;

    args = {depotId: 7, securitiesByIsin: {}};

    calls = [];
    createSecurity = jest.fn<CreateSecurity>((security: SecurityCreate): Observable<SecurityRead> => {
      calls.push(`security:${security.isin}`);
      return security.isin === failingIsin
        ? throwError((): Error => new Error('isin already taken'))
        : of(created);
    });
    securityApi = {createSecurity} as unknown as SecurityApi;

    createTransaction = jest.fn<CreateTransaction>((depotId: number, body: TransactionCreate): Observable<TransactionRead> => {
      calls.push(`transaction:${depotId}:${body.securityId}`);
      return of({} as TransactionRead);
    });
    transactionApi = {createTransaction} as unknown as TransactionApi;

    getStockSplits = jest.fn<GetStockSplits>((): Observable<StockSplit[]> => of([]));
    stockSplitApi = {getStockSplits} as unknown as StockSplitApi;

    dispatch = jest.fn<(action: unknown) => void>();
    globalStore = {dispatch} as unknown as Store<AppState>;

    reloadFirstPage = jest.fn<() => void>();
    transactionPageStore = {reloadFirstPage} as unknown as ReadableTransactionPageStore;
  });

  it('creates every new security before importing any transaction', async (): Promise<void> => {
    await run();

    expect(calls).toEqual([
      `security:${okIsin}`,
      `security:${failingIsin}`,
      `transaction:${args.depotId}:${created.id}`,
      `transaction:${args.depotId}:${created.id}`
    ]);
  });

  it('skips the transactions of a security that failed to create, sending no request for them', async (): Promise<void> => {
    await run();

    expect(createTransaction.mock.calls).toEqual([
      [args.depotId, {...collected[0].draft, securityId: created.id}],
      [args.depotId, {...collected[1].draft, securityId: created.id}]
    ]);
    expect(store.failedIsins()).toEqual([failingIsin]);
  });

  it('settles every new security and every collected transaction, successful or not', async (): Promise<void> => {
    await run();

    expect(store.importDone()).toBe(newSecuritiesSignal().length + collected.length);
    expect(store.securitiesCreated()).toBe(1);
    expect(store.transactionsCreated()).toBe(2);
  });

  it('makes the created security available in the global store exactly once', async (): Promise<void> => {
    await run();

    expect(dispatch.mock.calls).toEqual([
      [SecurityActions.setSecurities({securities: [created]})],
      [DepotActions.reloadDepots()]
    ]);
  });

  it('reloads the depots and the transaction page once, after the whole run settled', async (): Promise<void> => {
    await run();

    expect(reloadFirstPage).toHaveBeenCalledTimes(1);
    expect(reloadFirstPage).toHaveBeenCalledWith();
    expect(store.phase()).toBe('imported');
  });

  it('looks up stock splits for no security that is only being created in this run', async (): Promise<void> => {
    await run();

    expect(getStockSplits).not.toHaveBeenCalled();
  });

  it('sends no further request once the run was cancelled', async (): Promise<void> => {
    createSecurity.mockImplementation((security: SecurityCreate): Observable<SecurityRead> => {
      calls.push(`security:${security.isin}`);
      patchState(store, {cancelled: true});
      return of(created);
    });

    await run();

    expect(calls).toEqual([`security:${okIsin}`]);
    expect(createTransaction).not.toHaveBeenCalled();
  });

  describe('with no security left to create', (): void => {
    beforeEach((): void => {
      newSecuritiesSignal.set([]);
    });

    it('books a transaction on a security the app already knows, creating no security for it', async (): Promise<void> => {
      const known: SecurityRead = securityReadFactory({isin: okIsin, id: 11});
      args = {...args, securitiesByIsin: {[known.isin]: known} satisfies SecuritiesByIsin};

      await run();

      expect(createSecurity).not.toHaveBeenCalled();
      expect(createTransaction.mock.calls).toEqual([
        [args.depotId, {...collected[0].draft, securityId: known.id}],
        [args.depotId, {...collected[1].draft, securityId: known.id}]
      ]);
      expect(store.transactionsCreated()).toBe(2);
    });

    it('settles a transaction whose ISIN no security carries, sending no request for it', async (): Promise<void> => {
      await run();

      expect(createTransaction).not.toHaveBeenCalled();
      expect(store.importDone()).toBe(collected.length);
      expect(store.transactionsCreated()).toBe(0);
    });

    it('applies every stock split with an exDate after the transaction\'s date to the stated quantity', async (): Promise<void> => {
      const known: SecurityRead = securityReadFactory({isin: okIsin, id: 11});
      args = {
        ...args,
        securitiesByIsin: {
          [known.isin]: known
        } satisfies SecuritiesByIsin
      };
      const applyingSplit: StockSplit = stockSplitFactory({exDate: '2024-05-20', quantityOld: 1, quantityNew: 4});
      getStockSplits.mockImplementation((id: number): Observable<StockSplit[]> => of(id === known.id ? [applyingSplit] : []));

      await run();

      const securityCountSplitAdjusted: number =
        collected[0].draft.securityCountOriginal * (applyingSplit.quantityNew / applyingSplit.quantityOld);
      expect(createTransaction.mock.calls).toEqual([
        [args.depotId, {...collected[0].draft, securityId: known.id, securityCountSplitAdjusted}],
        [args.depotId, {...collected[1].draft, securityId: known.id, securityCountSplitAdjusted}]
      ]);
    });

    it('carries no split-adjusted quantity when no recorded split is newer than the transaction\'s date', async (): Promise<void> => {
      const known: SecurityRead = securityReadFactory({isin: okIsin, id: 11});
      args = {
        ...args,
        securitiesByIsin: {
          [known.isin]: known
        } satisfies SecuritiesByIsin
      };
      const notApplyingSplit: StockSplit = stockSplitFactory({exDate: collected[0].draft.date});
      getStockSplits.mockImplementation((): Observable<StockSplit[]> => of([notApplyingSplit]));

      await run();

      expect(createTransaction.mock.calls).toEqual([
        [args.depotId, {...collected[0].draft, securityId: known.id}],
        [args.depotId, {...collected[1].draft, securityId: known.id}]
      ]);
    });

    it('still books the transaction without a split-adjusted quantity when the stock-split lookup fails', async (): Promise<void> => {
      const known: SecurityRead = securityReadFactory({isin: okIsin, id: 11});
      args = {
        ...args,
        securitiesByIsin: {
          [known.isin]: known
        } satisfies SecuritiesByIsin
      };
      getStockSplits.mockReturnValue(throwError((): Error => new Error('not found')));

      await run();

      expect(createTransaction.mock.calls).toEqual([
        [args.depotId, {...collected[0].draft, securityId: known.id}],
        [args.depotId, {...collected[1].draft, securityId: known.id}]
      ]);
      expect(store.transactionsCreated()).toBe(2);
    });
  });
});
