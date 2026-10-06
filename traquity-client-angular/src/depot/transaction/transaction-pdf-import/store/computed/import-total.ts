import {computed, Signal} from "@angular/core";
import {ReadableSignalStore} from "../../../../../common/types/signal-store.type";
import {SecurityCreate} from "../../../../../gen/api/security";
import {TransactionPdfImportState} from "../transaction-pdf-import.type";

export function importTotal(signalStore: ReadableSignalStore<TransactionPdfImportState>,
                            newSecuritiesSignal: Signal<SecurityCreate[]>): Signal<number> {
  return computed((): number => newSecuritiesSignal().length + signalStore.collected().length);
}
