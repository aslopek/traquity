import {inject, Signal} from "@angular/core";
import {signalStore, withComputed, withMethods, withState} from "@ngrx/signals";
import {RxMethod} from "@ngrx/signals/rxjs-interop";
import {Store} from "@ngrx/store";
import {AiBridgeService} from "../../../../bridge/ai-bridge.service";
import {ReadableSignalStore, WritableSignalStore} from "../../../../common/types/signal-store.type";
import {AppState} from "../../../../store/app.state";
import {canImport} from "./computed/can-import";
import {importPdf, ImportPdfArgs} from "./effects/import-pdf";
import {clearPrefill} from "./methods/clear-prefill";
import {ImportMessage, TransactionPrefill} from "./transaction-import.type";

export type TransactionImportState = {
  /** Set for as long as one document is being read and extracted. */
  busy: boolean
  /** What the dialog last said about an import, or `null` before the first one. */
  message: ImportMessage | null
  /** The values one completed extraction offers. */
  prefill: TransactionPrefill | null
};

export type TransactionImportComputed = {
  /** Whether a document may be handed over at all: AI has to be active and nothing else may be running. */
  canImport: Signal<boolean>
};

export type TransactionImportMethods = {
  importPdf: RxMethod<ImportPdfArgs>
  /** Clears the values once the form has taken them, so the same extraction is never applied twice. */
  clearPrefill: () => void
};

const initialState: TransactionImportState = {
  busy: false,
  message: null,
  prefill: null
} as const;

export type ReadableTransactionImportStore =
  ReadableSignalStore<TransactionImportState, TransactionImportComputed, TransactionImportMethods>;

export const TransactionImportStore = signalStore(
  withState(initialState),
  withComputed((store: ReadableSignalStore<TransactionImportState>): TransactionImportComputed => {
    const globalStore: Store<AppState> = inject(Store);
    return {
      canImport: canImport(store, globalStore)
    };
  }),
  withMethods((store: WritableSignalStore<TransactionImportState, TransactionImportComputed>):
  TransactionImportMethods => {
    const aiBridge: AiBridgeService = inject(AiBridgeService);
    return {
      importPdf: importPdf(store, aiBridge),
      clearPrefill: (): void => clearPrefill(store)
    };
  })
);
