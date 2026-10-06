import {describe, expect, it} from "@jest/globals";
import {ExtractedTransaction} from "../../../../../bridge/ai-bridge.type";
import {extractedTransactionFactory as extractedFactory} from "../../../../../testing/extracted-transaction.factory";
import {transactionOfExtraction} from "./transaction-of-extraction";
import {PdfTransactionDraft} from "../transaction-pdf-import.type";

describe("transactionOfExtraction", (): void => {
  it("carries every stated value, normalizing a time with no seconds", (): void => {
    const extracted: ExtractedTransaction = extractedFactory({time: "14:30", tax: 5, fee: 1});

    expect(transactionOfExtraction(extracted)).toEqual({
      date: extracted.date,
      time: "14:30:00",
      transactionType: extracted.transactionType,
      securityCountOriginal: extracted.securityCountOriginal,
      grossValue: extracted.grossValue,
      tax: 5,
      fee: 1
    } satisfies PdfTransactionDraft);
  });

  it("leaves the time undefined when the document names none", (): void => {
    const extracted: ExtractedTransaction = extractedFactory();

    expect(transactionOfExtraction(extracted)?.time).toBeUndefined();
  });

  it("is faulty for a transaction type outside the known ones", (): void => {
    const extracted: ExtractedTransaction = extractedFactory({transactionType: "DEPOSIT" as ExtractedTransaction["transactionType"]});

    expect(transactionOfExtraction(extracted)).toBeNull();
  });

  it("is faulty for a malformed date", (): void => {
    const extracted: ExtractedTransaction = extractedFactory({date: "02/02/2024"});

    expect(transactionOfExtraction(extracted)).toBeNull();
  });

  it("is faulty for a date that is not a real calendar day", (): void => {
    const extracted: ExtractedTransaction = extractedFactory({date: "2024-02-31"});

    expect(transactionOfExtraction(extracted)).toBeNull();
  });

  it("is faulty for a non-finite security count", (): void => {
    const extracted: ExtractedTransaction = extractedFactory({securityCountOriginal: Number.NaN});

    expect(transactionOfExtraction(extracted)).toBeNull();
  });

  it("is faulty for a non-finite gross value", (): void => {
    const extracted: ExtractedTransaction = extractedFactory({grossValue: Number.POSITIVE_INFINITY});

    expect(transactionOfExtraction(extracted)).toBeNull();
  });

  it("drops a non-finite tax instead of failing the whole document", (): void => {
    const extracted: ExtractedTransaction = extractedFactory({tax: Number.NaN});

    expect(transactionOfExtraction(extracted)?.tax).toBeUndefined();
  });
});
