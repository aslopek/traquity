import {describe, expect, it} from "@jest/globals";
import {signalState, SignalState} from "@ngrx/signals";
import {collectedTransactionFactory} from "../../../../../testing/collected-transaction.factory";
import {initialState, TransactionPdfImportState} from "../transaction-pdf-import.type";
import {transactionCountByIsin} from "./transaction-count-by-isin";

describe("transactionCountByIsin", (): void => {
  it("counts how many collected() entries name each ISIN", (): void => {
    const store: SignalState<TransactionPdfImportState> = signalState<TransactionPdfImportState>({
      ...initialState,
      collected: [
        collectedTransactionFactory({isin: "US0378331005", path: "/a.pdf"}),
        collectedTransactionFactory({isin: "DE0007236101", path: "/b.pdf"}),
        collectedTransactionFactory({isin: "US0378331005", path: "/c.pdf"})
      ]
    });

    expect(transactionCountByIsin(store)()).toEqual({
      US0378331005: 2,
      DE0007236101: 1
    });
  });

  it("yields an empty record when nothing was collected", (): void => {
    const store: SignalState<TransactionPdfImportState> = signalState<TransactionPdfImportState>({...initialState});

    expect(transactionCountByIsin(store)()).toEqual({});
  });
});
