import {describe, expect, it} from "@jest/globals";
import {signal, Signal} from "@angular/core";
import {signalState, SignalState} from "@ngrx/signals";
import {SecurityCreate, SecurityType} from "../../../../../gen/api/security";
import {collectedTransactionFactory} from "../../../../../testing/collected-transaction.factory";
import {CollectedTransaction, initialState, TransactionPdfImportState} from "../transaction-pdf-import.type";
import {importTotal} from "./import-total";

describe("importTotal", (): void => {
  it("sums the new securities and the collected transactions", (): void => {
    const collected: CollectedTransaction[] = [
      collectedTransactionFactory({isin: "US0378331005"}),
      collectedTransactionFactory({isin: "DE0007236101"})
    ];
    const store: SignalState<TransactionPdfImportState> = signalState<TransactionPdfImportState>({
      ...initialState,
      collected
    });
    const newSecurities: Signal<SecurityCreate[]> = signal<SecurityCreate[]>([
      {isin: "US0378331005", name: "Apple Inc.", symbols: [], securityType: SecurityType.STOCK}
    ]);

    expect(importTotal(store, newSecurities)()).toBe(3);
  });
});
