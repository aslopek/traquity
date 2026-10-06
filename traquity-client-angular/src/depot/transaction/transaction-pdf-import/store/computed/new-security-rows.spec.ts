import {describe, expect, it} from "@jest/globals";
import {signal, Signal} from "@angular/core";
import {signalState, SignalState} from "@ngrx/signals";
import {initialState, TransactionPdfImportState} from "../transaction-pdf-import.type";
import {newSecurityRows} from "./new-security-rows";

describe("newSecurityRows", (): void => {
  it("pairs every unknown ISIN with the name typed for it so far", (): void => {
    const store: SignalState<TransactionPdfImportState> = signalState<TransactionPdfImportState>({
      ...initialState,
      namesByIsin: {US0378331005: "Apple Inc."}
    });
    const unknownIsins: Signal<string[]> = signal<string[]>(["US0378331005", "DE0007236101"]);

    expect(newSecurityRows(store, unknownIsins)()).toEqual([
      {isin: "US0378331005", typedName: "Apple Inc."},
      {isin: "DE0007236101", typedName: ""}
    ]);
  });
});
