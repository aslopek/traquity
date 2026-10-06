import {beforeEach, describe, expect, it} from "@jest/globals";
import {signalState, SignalState} from "@ngrx/signals";
import {initialState, TransactionPdfImportState} from "../transaction-pdf-import.type";
import {setSecurityName} from "./set-security-name";

describe("setSecurityName", (): void => {
  let store: SignalState<TransactionPdfImportState>;

  beforeEach((): void => {
    store = signalState<TransactionPdfImportState>({
      ...initialState,
      namesByIsin: {
        US0378331005: "Apple Inc."
      }
    });
  });

  it("adds a name for a new ISIN without touching the others", (): void => {
    setSecurityName(store, "DE0007236101", "Siemens AG");

    expect(store.namesByIsin()).toEqual({
      US0378331005: "Apple Inc.",
      DE0007236101: "Siemens AG"
    });
  });

  it("replaces the name already typed for an ISIN", (): void => {
    setSecurityName(store, "US0378331005", "Apple");

    expect(store.namesByIsin()).toEqual({US0378331005: "Apple"});
  });
});
