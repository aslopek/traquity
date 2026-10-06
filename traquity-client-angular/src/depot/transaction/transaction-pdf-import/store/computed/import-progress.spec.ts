import {describe, expect, it} from "@jest/globals";
import {signal, Signal} from "@angular/core";
import {signalState, SignalState} from "@ngrx/signals";
import {initialState, TransactionPdfImportState} from "../transaction-pdf-import.type";
import {importProgress} from "./import-progress";

describe("importProgress", (): void => {
  it("is zero with nothing to settle", (): void => {
    const store: SignalState<TransactionPdfImportState> = signalState<TransactionPdfImportState>({...initialState});
    const total: Signal<number> = signal<number>(0);

    expect(importProgress(store, total)()).toBe(0);
  });

  it("is the settled share of the total", (): void => {
    const store: SignalState<TransactionPdfImportState> = signalState<TransactionPdfImportState>({
      ...initialState,
      importDone: 3
    });
    const total: Signal<number> = signal<number>(4);

    expect(importProgress(store, total)()).toBe(75);
  });
});
