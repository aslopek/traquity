import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {patchState} from "@ngrx/signals";
import {Observable, of, throwError} from "rxjs";
import {AiBridgeService} from "../../../../../bridge/ai-bridge.service";
import {AiExtractionOutcome, AiExtractionRequest, ExtractedTransaction} from "../../../../../bridge/ai-bridge.type";
import {extractPdf, PdfExtractionResult} from "../../../../../common/pdf/extract-pdf";
import {PdfDocument} from "../../../../../common/pdf/pdf-document.type";
import {DocumentToken} from "../../../../../common/pdf/tokens-of-document";
import {PdfTransactionReading, transactionReadingOfDocument} from "../../../../../common/pdf/transaction-reading-of-document";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {SecuritiesByIsin} from "../../../../../store/security/selectors/get-securities-by-isin.selector";
import {securityReadFactory} from "../../../../../testing/security-read.factory";
import {prefillOfExtraction} from "./prefill-of-extraction";
import {TransactionImportComputed, TransactionImportState} from "../transaction-import.store";
import {ImportedFile, ImportPdfArgs, importPdfPipeline} from "./import-pdf";

jest.mock("@ngrx/signals", (): unknown => ({patchState: jest.fn()}));
jest.mock("../../../../../common/pdf/extract-pdf", (): unknown => ({extractPdf: jest.fn()}));
jest.mock("../../../../../common/pdf/transaction-reading-of-document",
  (): unknown => ({transactionReadingOfDocument: jest.fn()}));
jest.mock("./prefill-of-extraction", (): unknown => ({prefillOfExtraction: jest.fn()}));

type PatchState = (store: unknown, update: Partial<TransactionImportState>) => void;
type ExtractPdf = (bytes: ArrayBuffer, currency: string) => Promise<PdfExtractionResult>;
type TransactionReadingOfDocument = (document: PdfDocument) => PdfTransactionReading;
type PrefillOfExtraction = (transaction: ExtractedTransaction, isin: string | undefined,
                            securities: SecuritiesByIsin, fileName: string) => { prefill: unknown, message: unknown };
type ExtractTransaction = (request: AiExtractionRequest) => Observable<AiExtractionOutcome>;
type ImportStore = WritableSignalStore<TransactionImportState, TransactionImportComputed>;

const DOCUMENT_TEXT: string = "Kurswert  |  1700.00 EUR";
const ISIN: string = "US0378331005";

function fileFactory(bytes: ArrayBuffer, overrides: Partial<ImportedFile> = {}): ImportedFile {
  return {
    name: "settlement.pdf",
    type: "application/pdf",
    arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(bytes),
    ...overrides,
  };
}

describe("importPdf", (): void => {
  let patchStateMock: jest.Mock<PatchState>;
  let extractPdfMock: jest.Mock<ExtractPdf>;
  let transactionReadingOfDocumentMock: jest.Mock<TransactionReadingOfDocument>;
  let prefillOfExtractionMock: jest.Mock<PrefillOfExtraction>;
  let extractTransaction: jest.Mock<ExtractTransaction>;
  let store: ImportStore;
  let args: ImportPdfArgs;
  let outcome: AiExtractionOutcome;
  let transaction: ExtractedTransaction;
  let bytes: ArrayBuffer;
  let pdfDocument: PdfDocument;
  let tokens: DocumentToken[];
  let reading: PdfTransactionReading;

  /** Runs the effect once against the current `args` and resolves when the pipeline has completed. */
  function run(): Promise<void> {
    return new Promise<void>((resolve): void => {
      of(args)
        .pipe(importPdfPipeline(store, {extractTransaction} as unknown as AiBridgeService))
        .subscribe({complete: (): void => resolve()});
    });
  }

  beforeEach((): void => {
    bytes = new ArrayBuffer(8);
    pdfDocument = {pages: []};
    tokens = [{id: 1, kind: "number", text: "1.700,00", value: "1700.00", label: "Kurswert"}];
    reading = {text: DOCUMENT_TEXT, tokens, isin: ISIN};

    patchStateMock = patchState as unknown as jest.Mock<PatchState>;
    patchStateMock.mockReset();
    extractPdfMock = extractPdf as unknown as jest.Mock<ExtractPdf>;
    extractPdfMock.mockReset();
    extractPdfMock.mockResolvedValue({status: "extracted", document: pdfDocument});
    transactionReadingOfDocumentMock = transactionReadingOfDocument as unknown as jest.Mock<TransactionReadingOfDocument>;
    transactionReadingOfDocumentMock.mockReset();
    transactionReadingOfDocumentMock.mockReturnValue(reading);
    prefillOfExtractionMock = prefillOfExtraction as unknown as jest.Mock<PrefillOfExtraction>;
    prefillOfExtractionMock.mockReset();
    prefillOfExtractionMock.mockReturnValue({prefill: {grossValue: "1700"}, message: {kind: "info", text: "filled"}});

    transaction = {transactionType: "SELL", date: "2024-02-02", securityCountOriginal: 10, grossValue: 1700};
    outcome = {status: "extracted", transaction};
    extractTransaction = jest.fn<ExtractTransaction>(() => of(outcome));

    store = {} as ImportStore;
    args = {
      file: fileFactory(bytes),
      currency: "EUR",
      modelKey: "model-a",
      securitiesByIsin: {[securityReadFactory().isin]: securityReadFactory()},
    };
  });

  it("hands the rendered document, its literals, the currency and the model key to the bridge", async (): Promise<void> => {
    await run();

    expect(extractTransaction).toHaveBeenCalledWith({
      document: DOCUMENT_TEXT,
      tokens,
      currency: "EUR",
      modelKey: "model-a",
    });
    expect(extractTransaction).toHaveBeenCalledTimes(1);
  });

  it("parses the file's own bytes against the depot's currency and reads the document it got back",
    async (): Promise<void> => {
      await run();

      expect(extractPdfMock).toHaveBeenCalledWith(bytes, args.currency);
      expect(extractPdfMock).toHaveBeenCalledTimes(1);
      expect(transactionReadingOfDocumentMock).toHaveBeenCalledWith(pdfDocument);
      expect(transactionReadingOfDocumentMock).toHaveBeenCalledTimes(1);
    });

  it("marks the import as running before it reaches the bridge", async (): Promise<void> => {
    await run();

    expect(patchStateMock).toHaveBeenCalledTimes(2);
    expect(patchStateMock.mock.calls[0]).toEqual([store, {busy: true, message: null, prefill: null}]);
  });

  it("offers the values a completed extraction produced", async (): Promise<void> => {
    await run();

    expect(patchStateMock).toHaveBeenCalledTimes(2);
    expect(patchStateMock.mock.calls[1]).toEqual([store, {
      busy: false,
      message: {kind: "info", text: "filled"},
      prefill: {grossValue: "1700"},
    }]);
  });

  it("maps the extraction against the securities and the file it came from", async (): Promise<void> => {
    await run();

    expect(prefillOfExtractionMock).toHaveBeenCalledWith(transaction, ISIN, args.securitiesByIsin, args.file.name);
    expect(prefillOfExtractionMock).toHaveBeenCalledTimes(1);
  });

  describe("refusals that never reach the bridge", (): void => {
    it("refuses a file that is not a PDF", async (): Promise<void> => {
      args = {...args, file: fileFactory(bytes, {name: "statement.csv", type: "text/csv"})};

      await run();

      expect(patchStateMock.mock.calls).toEqual([
        [store, {busy: false, message: {kind: "error", text: "Only PDF files can be imported."}, prefill: null}],
      ]);
      expect(extractTransaction).not.toHaveBeenCalled();
    });

    it("refuses to run with no model active", async (): Promise<void> => {
      args = {...args, modelKey: null};

      await run();

      expect(patchStateMock.mock.calls).toEqual([
        [store, {busy: false, message: {kind: "error", text: "No AI model is active."}, prefill: null}],
      ]);
      expect(extractTransaction).not.toHaveBeenCalled();
    });

    it("refuses a document carrying no text layer", async (): Promise<void> => {
      extractPdfMock.mockResolvedValue({status: "failed", failure: {reason: "noTextLayer"}});

      await run();

      expect(patchStateMock).toHaveBeenCalledTimes(2);
      expect(patchStateMock.mock.calls[1]).toEqual([store, {
        busy: false,
        message: {kind: "error", text: "settlement.pdf carries no readable text."},
        prefill: null,
      }]);
      expect(extractTransaction).not.toHaveBeenCalled();
    });

    it("refuses a document the parser cannot open", async (): Promise<void> => {
      extractPdfMock.mockResolvedValue({status: "failed", failure: {reason: "unreadable", message: "broken"}});

      await run();

      expect(patchStateMock).toHaveBeenCalledTimes(2);
      expect(patchStateMock.mock.calls[1]).toEqual([store, {
        busy: false,
        message: {kind: "error", text: "settlement.pdf could not be read."},
        prefill: null,
      }]);
      expect(extractTransaction).not.toHaveBeenCalled();
    });

    it("refuses a document of more pages than can be read", async (): Promise<void> => {
      extractPdfMock.mockResolvedValue({status: "failed", failure: {reason: "tooManyPages", pages: 80, maximum: 50}});

      await run();

      expect(patchStateMock).toHaveBeenCalledTimes(2);
      expect(patchStateMock.mock.calls[1]).toEqual([store, {
        busy: false,
        message: {kind: "error", text: "settlement.pdf has 80 pages, and at most 50 can be read."},
        prefill: null,
      }]);
      expect(extractTransaction).not.toHaveBeenCalled();
    });
  });

  it("reports what a failed extraction said, offering no values", async (): Promise<void> => {
    outcome = {status: "failed", message: "The model model-a is not installed."};
    extractTransaction.mockReturnValue(of(outcome));

    await run();

    expect(patchStateMock).toHaveBeenCalledTimes(2);
    expect(patchStateMock.mock.calls[1]).toEqual([store, {
      busy: false,
      message: {kind: "error", text: "The model model-a is not installed."},
      prefill: null,
    }]);
  });

  it("reports a file it could not read at all", async (): Promise<void> => {
    extractPdfMock.mockRejectedValue(new Error("out of memory"));

    await run();

    expect(patchStateMock).toHaveBeenCalledTimes(2);
    expect(patchStateMock.mock.calls[1]).toEqual([store, {
      busy: false,
      message: {kind: "error", text: "settlement.pdf could not be read."},
      prefill: null,
    }]);
  });

  it("reports a bridge call that failed outright without blaming the document it parsed", async (): Promise<void> => {
    extractTransaction.mockReturnValue(throwError((): Error => new Error("the bridge is gone")));

    await run();

    expect(patchStateMock).toHaveBeenCalledTimes(2);
    expect(patchStateMock.mock.calls[1]).toEqual([store, {
      busy: false,
      message: {kind: "error", text: "The extraction could not be started. See traquity.log for the reason."},
      prefill: null,
    }]);
  });
});
