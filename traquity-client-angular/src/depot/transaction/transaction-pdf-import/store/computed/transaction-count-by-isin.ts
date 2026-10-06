import {computed, Signal} from "@angular/core";
import {ReadableSignalStore} from "../../../../../common/types/signal-store.type";
import {TransactionPdfImportState} from "../transaction-pdf-import.type";

export function transactionCountByIsin(signalStore: ReadableSignalStore<TransactionPdfImportState>): Signal<{ [isin: string]: number }> {
  return computed((): { [isin: string]: number } => {
    const counts: { [isin: string]: number } = {};
    for (const entry of signalStore.collected()) {
      counts[entry.isin] = (counts[entry.isin] ?? 0) + 1;
    }
    return counts;
  });
}
