import {patchState} from "@ngrx/signals";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {TransactionPdfImportState} from "../transaction-pdf-import.type";

export function cancel(signalStore: WritableSignalStore<TransactionPdfImportState>): void {
  patchState(signalStore, {cancelled: true});
}
