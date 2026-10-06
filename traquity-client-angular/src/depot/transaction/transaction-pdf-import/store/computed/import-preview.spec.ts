import {describe, expect, it} from "@jest/globals";
import {signalState, SignalState} from "@ngrx/signals";
import {collectedTransactionFactory} from "../../../../../testing/collected-transaction.factory";
import {CollectedTransaction, initialState, TransactionPdfImportState} from "../transaction-pdf-import.type";
import {importPreview} from "./import-preview";

describe("importPreview", (): void => {
  it("counts the collected transactions per type and states no date range when none are collected", (): void => {
    const store: SignalState<TransactionPdfImportState> = signalState<TransactionPdfImportState>({...initialState});

    expect(importPreview(store)()).toEqual({
      countsByType: [],
      minDate: null,
      maxDate: null
    });
  });

  it("counts transactions per type and states the date range across them", (): void => {
    const collected: CollectedTransaction[] = [
      collectedTransactionFactory({draft: {date: "2024-02-02", transactionType: "BUY", securityCountOriginal: 1, grossValue: 100}}),
      collectedTransactionFactory({draft: {date: "2024-05-05", transactionType: "SELL", securityCountOriginal: 1, grossValue: 100}}),
      collectedTransactionFactory({draft: {date: "2024-01-01", transactionType: "BUY", securityCountOriginal: 1, grossValue: 100}})
    ];
    const store: SignalState<TransactionPdfImportState> = signalState<TransactionPdfImportState>({...initialState, collected});

    expect(importPreview(store)()).toEqual({
      countsByType: [
        {transactionType: "BUY", count: 2},
        {transactionType: "SELL", count: 1}
      ],
      minDate: "2024-01-01",
      maxDate: "2024-05-05"
    });
  });
});
