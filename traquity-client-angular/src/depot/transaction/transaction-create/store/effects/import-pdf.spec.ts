import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {patchState} from "@ngrx/signals";
import {Observable, of, throwError} from "rxjs";
import {AiBridgeService} from "../../../../../bridge/ai-bridge.service";
import {AiExtractionOutcome, AiExtractionRequest, ExtractedTransaction} from "../../../../../bridge/ai-bridge.type";
import {PdfExtractionResult} from "../../../../../common/pdf/extract-pdf";
import {extractPdf} from "../../../../../common/pdf/extract-pdf";
import {DocumentLiterals} from "../../../../../common/pdf/literals-of-document";
import {PdfReading, readingOfDocument} from "../../../../../common/pdf/reading-of-document";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {PdfDocument} from "../../../../../common/pdf/pdf-document.type";
import {SecuritiesByIsin} from "../../../../../store/security/selectors/get-securities-by-isin.selector";
import {securityReadFactory} from "../../../../../testing";
import {prefillOfExtraction} from "../prefill-of-extraction";
import {TransactionImportComputed, TransactionImportState} from "../transaction-import.store";
import {importPdfPipeline, ImportPdfArgs} from "./import-pdf";

jest.mock("@ngrx/signals", (): unknown => ({patchState: jest.fn()}));
jest.mock("../../../../../common/pdf/extract-pdf", (): unknown => ({extractPdf: jest.fn()}));
jest.mock("../../../../../common/pdf/reading-of-document", (): unknown => ({readingOfDocument: jest.fn()}));
jest.mock("../prefill-of-extraction", (): unknown => ({prefillOfExtraction: jest.fn()}));

type PatchState = (store: unknown, update: Partial<TransactionImportState>) => void;
type ExtractPdf = (bytes: ArrayBuffer, currency: string) => Promise<PdfExtractionResult>;
type ReadingOfDocument = (document: PdfDocument) => PdfReading;
type PrefillOfExtraction = (transaction: ExtractedTransaction, isin: string | undefined,
                            securities: SecuritiesByIsin, fileName: string) => { prefill: unknown, message: unknown };
type ExtractTransaction = (request: AiExtractionRequest) => Observable<AiExtractionOutcome>;
type ImportStore = WritableSignalStore<TransactionImportState, TransactionImportComputed>;

const DOCUMENT_TEXT: string = "Kurswert  |  1700.00 EUR";
const BYTES: ArrayBuffer = new ArrayBuffer(8);
const PDF_DOCUMENT: PdfDocument = {pages: []};
const LITERALS: DocumentLiterals = {dates: ["2024-02-02"], times: [], numbers: ["1700.00"]};
const ISIN: string = "US0378331005";
const READING: PdfReading = {text: DOCUMENT_TEXT, literals: LITERALS, isin: ISIN};

function fileFactory(overrides: Partial<{ name: string, type: string }> = {}): File {
  return {
    name: "settlement.pdf",
    type: "application/pdf",
    arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(BYTES),
    ...overrides,
  } as unknown as File;
}

describe("importPdf", (): void => {

  let patchStateMock: jest.Mock<PatchState>;
  let extractPdfMock: jest.Mock<ExtractPdf>;
  let readingOfDocumentMock: jest.Mock<ReadingOfDocument>;
  let prefillOfExtractionMock: jest.Mock<PrefillOfExtraction>;
  let extractTransaction: jest.Mock<ExtractTransaction>;
  let store: ImportStore;
  let args: ImportPdfArgs;
  let outcome: AiExtractionOutcome;
  let transaction: ExtractedTransaction;

  /** Runs the effect once against the current `args` and lets every synchronous promise settle. */
  async function run(): Promise<void> {
    of(args).pipe(importPdfPipeline(store, {extractTransaction} as unknown as AiBridgeService)).subscribe();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }

  beforeEach((): void => {
    patchStateMock = patchState as unknown as jest.Mock<PatchState>;
    patchStateMock.mockReset();
    extractPdfMock = extractPdf as unknown as jest.Mock<ExtractPdf>;
    extractPdfMock.mockReset();
    extractPdfMock.mockResolvedValue({status: "extracted", document: PDF_DOCUMENT});
    readingOfDocumentMock = readingOfDocument as unknown as jest.Mock<ReadingOfDocument>;
    readingOfDocumentMock.mockReset();
    readingOfDocumentMock.mockReturnValue(READING);
    prefillOfExtractionMock = prefillOfExtraction as unknown as jest.Mock<PrefillOfExtraction>;
    prefillOfExtractionMock.mockReset();
    prefillOfExtractionMock.mockReturnValue({prefill: {grossValue: "1700"}, message: {kind: "info", text: "filled"}});

    transaction = {transactionType: "SELL", date: "2024-02-02", securityCountOriginal: 10, grossValue: 1700};
    outcome = {status: "extracted", transaction};
    extractTransaction = jest.fn<ExtractTransaction>(() => of(outcome));

    store = {} as ImportStore;
    args = {
      file: fileFactory(),
      currency: "EUR",
      modelKey: "qwen-4b",
      securitiesByIsin: {[securityReadFactory().isin]: securityReadFactory()},
    };
  });

  it("hands the rendered document, its literals, the currency and the model key to the bridge", async (): Promise<void> => {
    await run();

    expect(extractTransaction).toHaveBeenCalledWith({
      document: DOCUMENT_TEXT,
      literals: LITERALS,
      currency: "EUR",
      modelKey: "qwen-4b",
    });
    expect(extractTransaction).toHaveBeenCalledTimes(1);
  });

  it("parses the file's own bytes in the depot's currency and reads the document it got back", async (): Promise<void> => {
    await run();

    expect(extractPdfMock).toHaveBeenCalledWith(BYTES, args.currency);
    expect(extractPdfMock).toHaveBeenCalledTimes(1);
    expect(readingOfDocumentMock).toHaveBeenCalledWith(PDF_DOCUMENT);
    expect(readingOfDocumentMock).toHaveBeenCalledTimes(1);
  });

  it("marks the import as running before it reaches the bridge", async (): Promise<void> => {
    await run();

    expect(patchStateMock.mock.calls[0]).toEqual([store, {busy: true, message: null, prefill: null}]);
  });

  it("offers the values a completed extraction produced", async (): Promise<void> => {
    await run();

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
      args = {...args, file: fileFactory({name: "statement.csv", type: "text/csv"})};

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

    it("refuses a document carrying no text layer, naming that as the reason", async (): Promise<void> => {
      extractPdfMock.mockResolvedValue({status: "failed", failure: {reason: "noTextLayer"}});

      await run();

      expect(patchStateMock.mock.calls[1]).toEqual([store, {
        busy: false,
        message: {
          kind: "error",
          text: "settlement.pdf carries no readable text. Scanned documents are not supported.",
        },
        prefill: null,
      }]);
      expect(extractTransaction).not.toHaveBeenCalled();
    });

    it("refuses a document the parser cannot open", async (): Promise<void> => {
      extractPdfMock.mockResolvedValue({status: "failed", failure: {reason: "unreadable", message: "broken"}});

      await run();

      expect(patchStateMock.mock.calls[1]).toEqual([store, {
        busy: false,
        message: {kind: "error", text: "settlement.pdf could not be read."},
        prefill: null,
      }]);
      expect(extractTransaction).not.toHaveBeenCalled();
    });

    it("refuses a document of more pages than can be read, naming both counts", async (): Promise<void> => {
      extractPdfMock.mockResolvedValue({status: "failed", failure: {reason: "tooManyPages", pages: 80, maximum: 50}});

      await run();

      expect(patchStateMock.mock.calls[1]).toEqual([store, {
        busy: false,
        message: {kind: "error", text: "settlement.pdf has 80 pages, and at most 50 can be read."},
        prefill: null,
      }]);
    });
  });

  it("reports what a failed extraction said, offering no values", async (): Promise<void> => {
    outcome = {status: "failed", message: "The model qwen-4b is not installed."};
    extractTransaction.mockReturnValue(of(outcome));

    await run();

    expect(patchStateMock.mock.calls[1]).toEqual([store, {
      busy: false,
      message: {kind: "error", text: "The model qwen-4b is not installed."},
      prefill: null,
    }]);
  });

  it("reports a file it could not read at all", async (): Promise<void> => {
    extractPdfMock.mockRejectedValue(new Error("out of memory"));

    await run();

    expect(patchStateMock.mock.calls[1]).toEqual([store, {
      busy: false,
      message: {kind: "error", text: "settlement.pdf could not be read."},
      prefill: null,
    }]);
  });

  it("reports a bridge call that failed outright", async (): Promise<void> => {
    extractTransaction.mockReturnValue(throwError((): Error => new Error("the bridge is gone")));

    await run();

    expect(patchStateMock.mock.calls[1]).toEqual([store, {
      busy: false,
      message: {kind: "error", text: "settlement.pdf could not be read."},
      prefill: null,
    }]);
  });
});
