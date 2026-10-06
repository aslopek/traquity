import {beforeEach, describe, expect, it} from "@jest/globals";
import {signalState, SignalState} from "@ngrx/signals";
import {initialState, TransactionPdfImportState} from "../transaction-pdf-import.type";
import {cancel} from "./cancel";

describe("cancel", (): void => {
  let store: SignalState<TransactionPdfImportState>;

  beforeEach((): void => {
    store = signalState<TransactionPdfImportState>({...initialState});
  });

  it("marks the run as cancelled", (): void => {
    cancel(store);

    expect(store.cancelled()).toBe(true);
  });
});
