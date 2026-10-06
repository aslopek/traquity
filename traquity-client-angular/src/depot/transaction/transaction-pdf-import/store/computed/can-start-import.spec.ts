import {describe, expect, it} from "@jest/globals";
import {signalState, SignalState} from "@ngrx/signals";
import {collectedTransactionFactory} from "../../../../../testing/collected-transaction.factory";
import {initialState, TransactionPdfImportState} from "../transaction-pdf-import.type";
import {canStartImport} from "./can-start-import";

describe("canStartImport", (): void => {
  it("refuses to start with nothing collected", (): void => {
    const store: SignalState<TransactionPdfImportState> = signalState<TransactionPdfImportState>({...initialState});

    expect(canStartImport(store)()).toBe(false);
  });

  it("allows starting once something was collected", (): void => {
    const store: SignalState<TransactionPdfImportState> = signalState<TransactionPdfImportState>({
      ...initialState,
      collected: [collectedTransactionFactory()]
    });

    expect(canStartImport(store)()).toBe(true);
  });
});
