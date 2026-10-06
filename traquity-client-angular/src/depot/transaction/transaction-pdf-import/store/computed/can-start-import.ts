import {computed, Signal} from "@angular/core";
import {ReadableSignalStore} from "../../../../../common/types/signal-store.type";
import {TransactionPdfImportState} from "../transaction-pdf-import.type";

export function canStartImport(signalStore: ReadableSignalStore<TransactionPdfImportState>): Signal<boolean> {
  return computed((): boolean => signalStore.collected().length > 0);
}
