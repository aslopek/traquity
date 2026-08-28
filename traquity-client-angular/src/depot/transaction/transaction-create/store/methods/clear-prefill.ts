import {patchState} from "@ngrx/signals";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {TransactionImportComputed, TransactionImportState} from "../transaction-import.store";

/**
 * Drops the values a completed extraction offered, once they have been taken. The message stays: it says where the
 * values in the form came from, which remains true after they have landed there.
 */
export function clearPrefill(store: WritableSignalStore<TransactionImportState, TransactionImportComputed>): void {
  patchState(store, {prefill: null});
}
