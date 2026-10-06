import {computed, Signal} from "@angular/core";
import {ReadableSignalStore} from "../../../../../common/types/signal-store.type";
import {SecuritiesByIsin} from "../../../../../store/security/selectors/get-securities-by-isin.selector";
import {TransactionPdfImportState} from "../transaction-pdf-import.type";

export function unknownIsins(signalStore: ReadableSignalStore<TransactionPdfImportState>,
                             securitiesByIsinSignal: Signal<SecuritiesByIsin>): Signal<string[]> {
  return computed((): string[] => {
    const securitiesByIsin: SecuritiesByIsin = securitiesByIsinSignal();
    const isins: string[] = [];
    for (const entry of signalStore.collected()) {
      if (securitiesByIsin[entry.isin] === undefined && !isins.includes(entry.isin)) {
        isins.push(entry.isin);
      }
    }
    return isins;
  });
}
