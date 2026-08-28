import {patchState} from "@ngrx/signals";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {TransactionImportComputed, TransactionImportState} from "../transaction-import.store";

export function clearPrefill(store: WritableSignalStore<TransactionImportState, TransactionImportComputed>): void {
  patchState(store, {prefill: null});
}
