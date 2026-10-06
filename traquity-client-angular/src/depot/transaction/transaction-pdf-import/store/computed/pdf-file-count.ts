import {computed, Signal} from "@angular/core";
import {ReadableSignalStore} from "../../../../../common/types/signal-store.type";
import {TransactionPdfImportState} from "../transaction-pdf-import.type";

export function pdfFileCount(signalStore: ReadableSignalStore<TransactionPdfImportState>): Signal<number> {
  return computed((): number => signalStore.files().length);
}
