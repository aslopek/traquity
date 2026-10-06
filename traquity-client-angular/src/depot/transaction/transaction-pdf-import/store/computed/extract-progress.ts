import {computed, Signal} from "@angular/core";
import {ReadableSignalStore} from "../../../../../common/types/signal-store.type";
import {TransactionPdfImportState} from "../transaction-pdf-import.type";

export function extractProgress(signalStore: ReadableSignalStore<TransactionPdfImportState>): Signal<number> {
  return computed((): number => {
    const total: number = signalStore.files().length;
    return total === 0 ? 0 : (signalStore.filesDone() / total) * 100;
  });
}
