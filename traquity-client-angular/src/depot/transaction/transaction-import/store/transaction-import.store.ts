import {inject, Signal} from '@angular/core';
import {signalStore, withComputed, withHooks, withMethods, withState} from '@ngrx/signals';
import {Store} from '@ngrx/store';
import {ReadableSignalStore, WritableSignalStore} from '../../../../common/types/signal-store.type';
import {AppState} from '../../../../store/app.state';
import {SecurityActions} from '../../../../store/security/security.actions';
import {securitiesById as securitiesByIdSelector} from '../../../../store/security/security.selector';
import {SecuritiesById} from '../../../../store/security/security.state';
import {SecurityApi, SecurityCreate, StockSplitApi} from '../../../../gen/api/security';
import {TransactionApi, TransactionType} from '../../../../gen/api/depot-transaction';
import {ReadableTransactionPageStore, transactionPageStore} from '../../transaction-store/transaction-page.store';
import {ColumnMapping, CsvRow, ImportPhase, MappableField, RowResolution} from './csv/csv.type';
import {securitiesLookup, SecuritiesLookup} from './computed/securities-lookup';
import {distinctTypeValues} from './computed/distinct-type-values';
import {mappingOk} from './computed/mapping-ok';
import {rowResolutions} from './computed/row-resolutions';
import {unknownSecurities} from './computed/unknown-securities';
import {importPreview, ImportPreview} from './computed/import-preview';
import {setFile} from './methods/set-file';
import {setSeparator} from './methods/set-separator';
import {setColumnMapping} from './methods/set-column-mapping';
import {setTransactionTypeMapping} from './methods/set-transaction-type-mapping';
import {setDateFormat} from './methods/set-date-format';
import {setDecimalSeparator} from './methods/set-decimal-separator';
import {runImport} from './methods/run-import';
import {cancelImport} from './methods/cancel-import';

export type TransactionImportComputed = {
  distinctTypeValues: Signal<string[]>
  importPreview: Signal<ImportPreview>
  mappingOk: Signal<boolean>
  rowResolutions: Signal<RowResolution[]>
  securitiesById: Signal<SecuritiesById>
  securitiesLookup: Signal<SecuritiesLookup>
  unknownSecurities: Signal<SecurityCreate[]>
};

export type TransactionImportMethods = {
  cancelImport: () => void
  runImport: () => Promise<void>
  setColumnMapping: (field: MappableField, columnIndex: number | null) => void
  setDateFormat: (dateFormat: string | null) => void
  setDecimalSeparator: (decimalSeparator: ',' | '.') => void
  setFile: (file: File) => Promise<void>
  setSeparator: (separator: string) => void
  setTransactionTypeMapping: (csvValue: string, transactionType: TransactionType | null) => void
};

export type TransactionImportState = {
  fileName: string | null
  rawText: string | null
  separator: string | null
  headerRawLine: string
  header: string[]
  rows: CsvRow[]
  columnMapping: ColumnMapping
  transactionTypeMapping: { [csvValue: string]: TransactionType | null }
  dateFormat: string | null
  decimalSeparator: ',' | '.'
  phase: ImportPhase
  requestsSent: number
  requestsTotal: number
  securitiesAttempted: number
  securitiesCreated: number
  transactionsAttempted: number
  transactionsCreated: number
  failedRowIndices: number[]
  cancelled: boolean
};

const initialState: TransactionImportState = {
  fileName: null,
  rawText: null,
  separator: null,
  headerRawLine: '',
  header: [],
  rows: [],
  columnMapping: {},
  transactionTypeMapping: {},
  dateFormat: null,
  decimalSeparator: ',',
  phase: 'configuring',
  requestsSent: 0,
  requestsTotal: 0,
  securitiesAttempted: 0,
  securitiesCreated: 0,
  transactionsAttempted: 0,
  transactionsCreated: 0,
  failedRowIndices: [],
  cancelled: false
} as const;

export type ReadableTransactionImportStore = ReadableSignalStore<TransactionImportState, TransactionImportComputed, TransactionImportMethods>;

export const TransactionImportStore = signalStore(
  withState(initialState),
  withComputed((signalStore: ReadableSignalStore<TransactionImportState>): TransactionImportComputed => {
    const globalStore: Store<AppState> = inject(Store);
    const securitiesByIdSignal: Signal<SecuritiesById> = globalStore.selectSignal(securitiesByIdSelector);
    const securitiesLookupSignal: Signal<SecuritiesLookup> = securitiesLookup(securitiesByIdSignal);
    const distinctTypeValuesSignal: Signal<string[]> = distinctTypeValues(signalStore);
    const rowResolutionsSignal: Signal<RowResolution[]> = rowResolutions(signalStore, securitiesLookupSignal);
    const unknownSecuritiesSignal: Signal<SecurityCreate[]> = unknownSecurities(signalStore, rowResolutionsSignal);
    return {
      distinctTypeValues: distinctTypeValuesSignal,
      importPreview: importPreview(signalStore, rowResolutionsSignal),
      mappingOk: mappingOk(signalStore, distinctTypeValuesSignal),
      rowResolutions: rowResolutionsSignal,
      securitiesById: securitiesByIdSignal,
      securitiesLookup: securitiesLookupSignal,
      unknownSecurities: unknownSecuritiesSignal
    };
  }),
  withMethods((signalStore: WritableSignalStore<TransactionImportState, TransactionImportComputed>,
               globalStore: Store<AppState> = inject(Store),
               securityApi: SecurityApi = inject(SecurityApi),
               transactionApi: TransactionApi = inject(TransactionApi),
               stockSplitApi: StockSplitApi = inject(StockSplitApi),
               transactionPageStoreInstance: ReadableTransactionPageStore = inject(transactionPageStore)): TransactionImportMethods => {
    return {
      cancelImport: (): void => cancelImport(signalStore),
      runImport: (): Promise<void> =>
        runImport(signalStore, globalStore, securityApi, transactionApi, stockSplitApi, transactionPageStoreInstance),
      setColumnMapping: (field: MappableField, columnIndex: number | null): void => setColumnMapping(signalStore, field, columnIndex),
      setDateFormat: (dateFormat: string | null): void => setDateFormat(signalStore, dateFormat),
      setDecimalSeparator: (decimalSeparator: ',' | '.'): void => setDecimalSeparator(signalStore, decimalSeparator),
      setFile: (file: File): Promise<void> => setFile(signalStore, file),
      setSeparator: (separator: string): void => setSeparator(signalStore, separator),
      setTransactionTypeMapping: (csvValue: string, transactionType: TransactionType | null): void =>
        setTransactionTypeMapping(signalStore, csvValue, transactionType)
    };
  }),
  withHooks({
    onInit(): void {
      inject(Store).dispatch(SecurityActions.loadAllSecurities());
    }
  })
);
