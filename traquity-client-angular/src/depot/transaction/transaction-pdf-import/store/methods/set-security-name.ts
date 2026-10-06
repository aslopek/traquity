import {patchState} from "@ngrx/signals";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {TransactionPdfImportState} from "../transaction-pdf-import.type";

export function setSecurityName(signalStore: WritableSignalStore<TransactionPdfImportState>, isin: string, name: string): void {
  patchState(signalStore, {namesByIsin: {...signalStore.namesByIsin(), [isin]: name}});
}
