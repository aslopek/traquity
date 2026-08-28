import {beforeEach, describe, expect, it} from "@jest/globals";
import {ExtractedTransaction} from "../../../../bridge/ai-bridge.type";
import {TransactionType} from "../../../../gen/api/depot-transaction";
import {SecurityRead} from "../../../../gen/api/security";
import {SecuritiesByIsin} from "../../../../store/security/selectors/get-securities-by-isin.selector";
import {securityReadFactory} from "../../../../testing";
import {prefillOfExtraction, PrefillResult} from "./prefill-of-extraction";
import {TransactionPrefill} from "./transaction-import.type";

const FILE_NAME: string = "settlement.pdf";

function extractedFactory(overrides: Partial<ExtractedTransaction> = {}): ExtractedTransaction {
  return {
    transactionType: "SELL",
    date: "2024-02-02",
    time: "14:05:00",
    isin: "US0378331005",
    securityCountOriginal: 10,
    grossValue: 1700,
    tax: 25.32,
    fee: 4.9,
    ...overrides,
  };
}

describe("prefillOfExtraction", (): void => {

  let apple: SecurityRead;
  let securitiesByIsin: SecuritiesByIsin;
  let transaction: ExtractedTransaction;

  beforeEach((): void => {
    apple = securityReadFactory();
    securitiesByIsin = {[apple.isin]: apple};
    transaction = extractedFactory();
  });

  it("offers every field in the notation its own input carries", (): void => {
    expect(prefillOfExtraction(transaction, securitiesByIsin, FILE_NAME).prefill).toEqual({
      transactionType: TransactionType.SELL,
      isSpecialDividend: false,
      securityName: apple.name,
      date: new Date(2024, 1, 2),
      time: "14:05",
      securityCountOriginal: "10",
      grossValue: "1700",
      tax: "25.32",
      fee: "4.9",
    } satisfies TransactionPrefill);
  });

  it("says which document the values came from", (): void => {
    expect(prefillOfExtraction(transaction, securitiesByIsin, FILE_NAME).message).toEqual({
      kind: "info",
      text: `Filled from ${FILE_NAME}. Please check every value before creating the transaction.`,
    });
  });

  it("empties a field the document did not state", (): void => {
    transaction = extractedFactory({time: undefined, tax: undefined, fee: undefined});

    const result: PrefillResult = prefillOfExtraction(transaction, securitiesByIsin, FILE_NAME);

    expect(result.prefill).toEqual(expect.objectContaining({time: "", tax: "", fee: ""}));
  });

  it("keeps a stated zero, which is a printed line and not an absent one", (): void => {
    transaction = extractedFactory({tax: 0});

    expect(prefillOfExtraction(transaction, securitiesByIsin, FILE_NAME).prefill.tax).toBe("0");
  });

  describe("a dividend", (): void => {

    beforeEach((): void => {
      transaction = extractedFactory({transactionType: "DIVIDEND"});
    });

    it("fills the type the form offers", (): void => {
      expect(prefillOfExtraction(transaction, securitiesByIsin, FILE_NAME).prefill.transactionType)
        .toBe(TransactionType.DIVIDEND);
    });

    it("leaves the special-dividend checkbox to the user", (): void => {
      expect(prefillOfExtraction(transaction, securitiesByIsin, FILE_NAME).prefill.isSpecialDividend).toBe(false);
    });
  });

  describe("an ISIN no security carries", (): void => {

    beforeEach((): void => {
      transaction = extractedFactory({isin: "US0000PHANT7"});
    });

    it("fills no security", (): void => {
      expect(prefillOfExtraction(transaction, securitiesByIsin, FILE_NAME).prefill.securityName).toBe("");
    });

    it("says which ISIN was not found", (): void => {
      expect(prefillOfExtraction(transaction, securitiesByIsin, FILE_NAME).message).toEqual({
        kind: "warning",
        text: "No security with ISIN US0000PHANT7 is known. Please pick the security yourself.",
      });
    });

    it("fills every other field all the same", (): void => {
      expect(prefillOfExtraction(transaction, securitiesByIsin, FILE_NAME).prefill)
        .toEqual(expect.objectContaining({grossValue: "1700", tax: "25.32", fee: "4.9"}));
    });
  });

  describe("a document stating no ISIN", (): void => {

    beforeEach((): void => {
      transaction = extractedFactory({isin: undefined});
    });

    it("fills no security", (): void => {
      expect(prefillOfExtraction(transaction, securitiesByIsin, FILE_NAME).prefill.securityName).toBe("");
    });

    it("says the document named none", (): void => {
      expect(prefillOfExtraction(transaction, securitiesByIsin, FILE_NAME).message).toEqual({
        kind: "warning",
        text: `${FILE_NAME} named no ISIN that could be read. Please pick the security yourself.`,
      });
    });
  });

  it("offers a value the form rejects as it was extracted, leaving the verdict to the form", (): void => {
    transaction = extractedFactory({grossValue: -4375});

    expect(prefillOfExtraction(transaction, securitiesByIsin, FILE_NAME).prefill.grossValue).toBe("-4375");
  });

  it("fills no date it cannot read", (): void => {
    transaction = extractedFactory({date: "not-a-date"});

    expect(prefillOfExtraction(transaction, securitiesByIsin, FILE_NAME).prefill.date).toBeNull();
  });
});
