import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {firstValueFrom, Observable, of, throwError} from "rxjs";
import {AiBridgeService} from "../../../bridge/ai-bridge.service";
import {AiExtractionOutcome, AiExtractionRequest, ExtractedTransaction} from "../../../bridge/ai-bridge.type";
import {extractPdf, PdfExtractionResult} from "../../../common/pdf/extract-pdf";
import {PdfDocument} from "../../../common/pdf/pdf-document.type";
import {DocumentToken} from "../../../common/pdf/tokens-of-document";
import {PdfTransactionReading, transactionReadingOfDocument} from "../../../common/pdf/transaction-reading-of-document";
import {extractedTransactionFactory} from "../../../testing/extracted-transaction.factory";
import {extractTransactionOfPdf, PdfExtractionAttempt, PdfTransactionOutcome} from "./extract-transaction-of-pdf";
import {ImportedFile} from "./imported-file";

jest.mock("../../../common/pdf/extract-pdf", (): unknown => ({extractPdf: jest.fn()}));
jest.mock("../../../common/pdf/transaction-reading-of-document", (): unknown => ({transactionReadingOfDocument: jest.fn()}));

type ExtractPdf = (bytes: ArrayBuffer, currency: string) => Promise<PdfExtractionResult>;
type TransactionReadingOfDocument = (document: PdfDocument) => PdfTransactionReading;
type ExtractTransaction = (request: AiExtractionRequest) => Observable<AiExtractionOutcome>;

const DOCUMENT_TEXT: string = "Kurswert  |  1700.00 EUR";
const ISIN: string = "US0378331005";

function fileFactory(bytes: ArrayBuffer, overrides: Partial<ImportedFile> = {}): ImportedFile {
  return {
    name: "settlement.pdf",
    type: "application/pdf",
    arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(bytes),
    ...overrides
  };
}

describe("extractTransactionOfPdf", (): void => {
  let extractPdfMock: jest.Mock<ExtractPdf>;
  let transactionReadingOfDocumentMock: jest.Mock<TransactionReadingOfDocument>;
  let extractTransaction: jest.Mock<ExtractTransaction>;
  let attempt: PdfExtractionAttempt;
  let bytes: ArrayBuffer;
  let pdfDocument: PdfDocument;
  let tokens: DocumentToken[];
  let reading: PdfTransactionReading;
  let transaction: ExtractedTransaction;
  let outcome: AiExtractionOutcome;

  beforeEach((): void => {
    bytes = new ArrayBuffer(8);
    pdfDocument = {pages: []};
    tokens = [{id: 1, kind: "number", text: "1.700,00", value: "1700.00", label: "Kurswert"}];
    reading = {text: DOCUMENT_TEXT, tokens, isin: ISIN};

    extractPdfMock = extractPdf as unknown as jest.Mock<ExtractPdf>;
    extractPdfMock.mockReset();
    extractPdfMock.mockResolvedValue({status: "extracted", document: pdfDocument});
    transactionReadingOfDocumentMock = transactionReadingOfDocument as unknown as jest.Mock<TransactionReadingOfDocument>;
    transactionReadingOfDocumentMock.mockReset();
    transactionReadingOfDocumentMock.mockReturnValue(reading);

    transaction = extractedTransactionFactory();
    outcome = {status: "extracted", transaction};
    extractTransaction = jest.fn<ExtractTransaction>(() => of(outcome));

    attempt = {file: fileFactory(bytes), currency: "EUR", modelKey: "model-a"};
  });

  function run(): Promise<PdfTransactionOutcome> {
    return firstValueFrom(extractTransactionOfPdf(attempt, {extractTransaction} as unknown as AiBridgeService));
  }

  it("hands the rendered document, its tokens, the currency and the model key to the bridge", async (): Promise<void> => {
    await run();

    expect(extractTransaction).toHaveBeenCalledWith({document: DOCUMENT_TEXT, tokens, currency: "EUR", modelKey: "model-a"});
    expect(extractTransaction).toHaveBeenCalledTimes(1);
  });

  it("parses the file's own bytes against the given currency and reads the document it got back", async (): Promise<void> => {
    await run();

    expect(extractPdfMock).toHaveBeenCalledWith(bytes, attempt.currency);
    expect(extractPdfMock).toHaveBeenCalledTimes(1);
    expect(transactionReadingOfDocumentMock).toHaveBeenCalledWith(pdfDocument);
    expect(transactionReadingOfDocumentMock).toHaveBeenCalledTimes(1);
  });

  it("reports an extracted transaction with the document's own isin", async (): Promise<void> => {
    await expect(run()).resolves.toEqual({status: "extracted", transaction, isin: ISIN});
  });

  it("reports a failed extraction with the model's own message", async (): Promise<void> => {
    outcome = {status: "failed", message: "The model model-a is not installed."};
    extractTransaction.mockReturnValue(of(outcome));

    await expect(run()).resolves.toEqual({status: "failed", message: "The model model-a is not installed."});
  });

  it("reports a document the parser could not open, without reaching the bridge", async (): Promise<void> => {
    extractPdfMock.mockResolvedValue({status: "failed", failure: {reason: "noTextLayer"}});

    await expect(run()).resolves.toEqual({status: "parseFailed", failure: {reason: "noTextLayer"}});
    expect(extractTransaction).not.toHaveBeenCalled();
  });

  it("reports a file it could not read at all, without parsing it", async (): Promise<void> => {
    attempt = {...attempt, file: fileFactory(bytes, {arrayBuffer: (): Promise<ArrayBuffer> => Promise.reject(new Error("gone"))})};

    await expect(run()).resolves.toEqual({status: "unread"});
    expect(extractPdfMock).not.toHaveBeenCalled();
  });

  it("reports a bridge call that failed outright without blaming the document it parsed", async (): Promise<void> => {
    extractTransaction.mockReturnValue(throwError((): Error => new Error("the bridge is gone")));

    await expect(run()).resolves.toEqual({status: "refused"});
  });
});
