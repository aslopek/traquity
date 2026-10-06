import {describe, expect, it} from "@jest/globals";
import {signal, Signal} from "@angular/core";
import {signalState, SignalState} from "@ngrx/signals";
import {SecurityRead} from "../../../../../gen/api/security";
import {SecuritiesByIsin} from "../../../../../store/security/selectors/get-securities-by-isin.selector";
import {collectedTransactionFactory} from "../../../../../testing/collected-transaction.factory";
import {securityReadFactory} from "../../../../../testing/security-read.factory";
import {initialState, TransactionPdfImportState} from "../transaction-pdf-import.type";
import {unknownIsins} from "./unknown-isins";

describe("unknownIsins", (): void => {
  it("names the distinct ISINs collected() carries that no known security has", (): void => {
    const store: SignalState<TransactionPdfImportState> = signalState<TransactionPdfImportState>({
      ...initialState,
      collected: [
        collectedTransactionFactory({isin: "US0378331005", path: "/a.pdf"}),
        collectedTransactionFactory({isin: "DE0007236101", path: "/b.pdf"}),
        collectedTransactionFactory({isin: "US0378331005", path: "/c.pdf"})
      ]
    });
    const securitiesByIsin: Signal<SecuritiesByIsin> = signal<SecuritiesByIsin>({});

    expect(unknownIsins(store, securitiesByIsin)()).toEqual(["US0378331005", "DE0007236101"]);
  });

  it("excludes an ISIN a known security already carries", (): void => {
    const known: SecurityRead = securityReadFactory({isin: "US0378331005"});
    const store: SignalState<TransactionPdfImportState> = signalState<TransactionPdfImportState>({
      ...initialState,
      collected: [collectedTransactionFactory({isin: known.isin})]
    });
    const securitiesByIsin: Signal<SecuritiesByIsin> = signal<SecuritiesByIsin>({[known.isin]: known});

    expect(unknownIsins(store, securitiesByIsin)()).toEqual([]);
  });
});
