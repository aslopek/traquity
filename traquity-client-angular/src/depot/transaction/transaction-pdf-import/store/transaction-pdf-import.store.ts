import {inject, Signal} from "@angular/core";
import {signalStore, withComputed, withHooks, withMethods, withState} from "@ngrx/signals";
import {RxMethod} from "@ngrx/signals/rxjs-interop";
import {Store} from "@ngrx/store";
import {AiBridgeService} from "../../../../bridge/ai-bridge.service";
import {ReadableSignalStore, WritableSignalStore} from "../../../../common/types/signal-store.type";
import {AppState} from "../../../../store/app.state";
import {SecurityActions} from "../../../../store/security/security.actions";
import {securitiesByIsin as securitiesByIsinSelector} from "../../../../store/security/security.selector";
import {SecuritiesByIsin} from "../../../../store/security/selectors/get-securities-by-isin.selector";
import {SecurityApi, SecurityCreate} from "../../../../gen/api/security";
import {TransactionApi} from "../../../../gen/api/depot-transaction";
import {ReadableTransactionPageStore, transactionPageStore} from "../../transaction-store/transaction-page.store";
import {canStartImport} from "./computed/can-start-import";
import {extractProgress} from "./computed/extract-progress";
import {importPreview, PdfImportPreview} from "./computed/import-preview";
import {importProgress} from "./computed/import-progress";
import {importTotal} from "./computed/import-total";
import {newSecurities} from "./computed/new-securities";
import {newSecurityRows, NewSecurityRow} from "./computed/new-security-rows";
import {pdfFileCount} from "./computed/pdf-file-count";
import {transactionCountByIsin} from "./computed/transaction-count-by-isin";
import {unknownIsins} from "./computed/unknown-isins";
import {ExtractFolderArgs, extractFolder} from "./effects/extract-folder";
import {RunImportArgs, runImport} from "./effects/run-import";
import {cancel} from "./methods/cancel";
import {PickedFolder} from "./folder/picked-folder-of-files";
import {setFolder} from "./methods/set-folder";
import {setSecurityName} from "./methods/set-security-name";
import {initialState, TransactionPdfImportState} from "./transaction-pdf-import.type";

export type TransactionPdfImportComputed = {
  canStartImport: Signal<boolean>
  extractProgress: Signal<number>
  importPreview: Signal<PdfImportPreview>
  importProgress: Signal<number>
  importTotal: Signal<number>
  newSecurities: Signal<SecurityCreate[]>
  newSecurityRows: Signal<NewSecurityRow[]>
  pdfFileCount: Signal<number>
  transactionCountByIsin: Signal<{ [isin: string]: number }>
  unknownIsins: Signal<string[]>
};

export type TransactionPdfImportMethods = {
  cancel: () => void
  extractFolder: RxMethod<ExtractFolderArgs>
  runImport: RxMethod<RunImportArgs>
  setFolder: (folder: PickedFolder) => void
  setSecurityName: (isin: string, name: string) => void
};

export type ReadableTransactionPdfImportStore =
  ReadableSignalStore<TransactionPdfImportState, TransactionPdfImportComputed, TransactionPdfImportMethods>;

export const TransactionPdfImportStore = signalStore(
  withState(initialState),
  withComputed((signalStore: ReadableSignalStore<TransactionPdfImportState>): TransactionPdfImportComputed => {
    const globalStore: Store<AppState> = inject(Store);
    const securitiesByIsinSignal: Signal<SecuritiesByIsin> = globalStore.selectSignal(securitiesByIsinSelector);
    const unknownIsinsSignal: Signal<string[]> = unknownIsins(signalStore, securitiesByIsinSignal);
    const newSecurityRowsSignal: Signal<NewSecurityRow[]> = newSecurityRows(signalStore, unknownIsinsSignal);
    const newSecuritiesSignal: Signal<SecurityCreate[]> = newSecurities(newSecurityRowsSignal);
    const importTotalSignal: Signal<number> = importTotal(signalStore, newSecuritiesSignal);
    return {
      canStartImport: canStartImport(signalStore),
      extractProgress: extractProgress(signalStore),
      importPreview: importPreview(signalStore),
      importProgress: importProgress(signalStore, importTotalSignal),
      importTotal: importTotalSignal,
      newSecurities: newSecuritiesSignal,
      newSecurityRows: newSecurityRowsSignal,
      pdfFileCount: pdfFileCount(signalStore),
      transactionCountByIsin: transactionCountByIsin(signalStore),
      unknownIsins: unknownIsinsSignal
    };
  }),
  withMethods((signalStore: WritableSignalStore<TransactionPdfImportState, TransactionPdfImportComputed>,
               globalStore: Store<AppState> = inject(Store),
               aiBridge: AiBridgeService = inject(AiBridgeService),
               securityApi: SecurityApi = inject(SecurityApi),
               transactionApi: TransactionApi = inject(TransactionApi),
               transactionPageStoreInstance: ReadableTransactionPageStore = inject(transactionPageStore)): TransactionPdfImportMethods => {
    return {
      cancel: (): void => cancel(signalStore),
      extractFolder: extractFolder(signalStore, aiBridge),
      runImport: runImport(signalStore, globalStore, securityApi, transactionApi, transactionPageStoreInstance),
      setFolder: (folder: PickedFolder): void => setFolder(signalStore, folder),
      setSecurityName: (isin: string, name: string): void => setSecurityName(signalStore, isin, name)
    };
  }),
  withHooks({
    onInit(): void {
      inject(Store).dispatch(SecurityActions.loadAllSecurities());
    }
  })
);
