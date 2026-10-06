import {computed, Signal} from "@angular/core";
import {ReadableSignalStore} from "../../../../../common/types/signal-store.type";
import {TransactionPdfImportState} from "../transaction-pdf-import.type";

export function importProgress(signalStore: ReadableSignalStore<TransactionPdfImportState>,
                               importTotal: Signal<number>): Signal<number> {
  return computed((): number => {
    const total: number = importTotal();
    return total === 0 ? 0 : (signalStore.importDone() / total) * 100;
  });
}
