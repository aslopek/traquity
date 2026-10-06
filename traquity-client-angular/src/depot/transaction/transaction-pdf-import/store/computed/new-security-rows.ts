import {computed, Signal} from "@angular/core";
import {ReadableSignalStore} from "../../../../../common/types/signal-store.type";
import {TransactionPdfImportState} from "../transaction-pdf-import.type";

/** One row per unknown ISIN, carrying the name typed for it so far - empty where none was typed yet. */
export type NewSecurityRow = {
  isin: string
  typedName: string
};

export function newSecurityRows(signalStore: ReadableSignalStore<TransactionPdfImportState>,
                                unknownIsinsSignal: Signal<string[]>): Signal<NewSecurityRow[]> {
  return computed((): NewSecurityRow[] => {
    const namesByIsin: { [isin: string]: string } = signalStore.namesByIsin();
    return unknownIsinsSignal().map((isin: string): NewSecurityRow => ({isin, typedName: namesByIsin[isin] ?? ""}));
  });
}
