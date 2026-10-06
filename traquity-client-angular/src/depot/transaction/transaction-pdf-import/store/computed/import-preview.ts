import {computed, Signal} from "@angular/core";
import {ReadableSignalStore} from "../../../../../common/types/signal-store.type";
import {TransactionType} from "../../../../../gen/api/depot-transaction";
import {TransactionPdfImportState} from "../transaction-pdf-import.type";

export type TransactionTypeCount = {
  transactionType: TransactionType
  count: number
};

export type PdfImportPreview = {
  countsByType: TransactionTypeCount[]
  minDate: string | null
  maxDate: string | null
};

export function importPreview(signalStore: ReadableSignalStore<TransactionPdfImportState>): Signal<PdfImportPreview> {
  return computed((): PdfImportPreview => {
    const countsByType: Map<TransactionType, number> = new Map<TransactionType, number>();
    let minDate: string | null = null;
    let maxDate: string | null = null;

    for (const entry of signalStore.collected()) {
      const type: TransactionType = entry.draft.transactionType;
      countsByType.set(type, (countsByType.get(type) ?? 0) + 1);

      const date: string = entry.draft.date;
      if (minDate === null || date < minDate) {
        minDate = date;
      }
      if (maxDate === null || date > maxDate) {
        maxDate = date;
      }
    }

    return {
      countsByType: Array.from(countsByType.entries())
        .map(([transactionType, count]: [TransactionType, number]): TransactionTypeCount => ({transactionType, count})),
      minDate,
      maxDate
    };
  });
}
