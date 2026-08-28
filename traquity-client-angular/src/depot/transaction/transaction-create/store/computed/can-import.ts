import {computed, Signal} from "@angular/core";
import {Store} from "@ngrx/store";
import {ReadableSignalStore} from "../../../../../common/types/signal-store.type";
import {isAiActive} from "../../../../../store/ai/ai.selector";
import {AppState} from "../../../../../store/app.state";
import {TransactionImportState} from "../transaction-import.store";

export type CanImportSlice = Pick<TransactionImportState, "busy">;

export function canImport(signalStore: ReadableSignalStore<CanImportSlice>,
                          globalStore: Store<AppState>): Signal<boolean> {
  const aiActive: Signal<boolean> = globalStore.selectSignal(isAiActive);
  return computed((): boolean => aiActive() && !signalStore.busy());
}
