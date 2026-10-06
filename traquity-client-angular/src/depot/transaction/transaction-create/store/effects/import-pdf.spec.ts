import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {patchState} from "@ngrx/signals";
import {of} from "rxjs";
import {AiBridgeService} from "../../../../../bridge/ai-bridge.service";
import {ExtractedTransaction} from "../../../../../bridge/ai-bridge.type";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {SecuritiesByIsin} from "../../../../../store/security/selectors/get-securities-by-isin.selector";
import {extractTransactionOfPdf, PdfTransactionOutcome} from "../../../transaction-pdf/extract-transaction-of-pdf";
import {ImportedFile} from "../../../transaction-pdf/imported-file";
import {extractedTransactionFactory} from "../../../../../testing/extracted-transaction.factory";
import {securityReadFactory} from "../../../../../testing/security-read.factory";
import {prefillOfExtraction} from "./prefill-of-extraction";
import {TransactionImportComputed, TransactionImportState} from "../transaction-import.store";
import {ImportPdfArgs, importPdfPipeline} from "./import-pdf";

jest.mock("@ngrx/signals", (): unknown => ({patchState: jest.fn()}));
jest.mock("../../../transaction-pdf/extract-transaction-of-pdf", (): unknown => ({extractTransactionOfPdf: jest.fn()}));
jest.mock("./prefill-of-extraction", (): unknown => ({prefillOfExtraction: jest.fn()}));

type PatchState = (store: unknown, update: Partial<TransactionImportState>) => void;
type ExtractTransactionOfPdf = (attempt: unknown, aiBridge: unknown) => ReturnType<typeof extractTransactionOfPdf>;
type PrefillOfExtraction = (transaction: ExtractedTransaction, isin: string | undefined,
                            securities: SecuritiesByIsin, fileName: string) => { prefill: unknown, message: unknown };
type ImportStore = WritableSignalStore<TransactionImportState, TransactionImportComputed>;

const ISIN: string = "US0378331005";

function fileFactory(overrides: Partial<ImportedFile> = {}): ImportedFile {
  return {
    name: "settlement.pdf",
    type: "application/pdf",
    arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(new ArrayBuffer(8)),
    ...overrides
  };
}

describe("importPdf", (): void => {
  let patchStateMock: jest.Mock<PatchState>;
  let extractTransactionOfPdfMock: jest.Mock<ExtractTransactionOfPdf>;
  let prefillOfExtractionMock: jest.Mock<PrefillOfExtraction>;
  let store: ImportStore;
  let args: ImportPdfArgs;
  let outcome: PdfTransactionOutcome;
  let transaction: ExtractedTransaction;

  /** Runs the effect once against the current `args` and resolves when the pipeline has completed. */
  function run(): Promise<void> {
    return new Promise<void>((resolve): void => {
      of(args)
        .pipe(importPdfPipeline(store, {} as AiBridgeService))
        .subscribe({complete: (): void => resolve()});
    });
  }

  beforeEach((): void => {
    patchStateMock = patchState as unknown as jest.Mock<PatchState>;
    patchStateMock.mockReset();

    transaction = extractedTransactionFactory();
    outcome = {status: "extracted", transaction, isin: ISIN};
    extractTransactionOfPdfMock = extractTransactionOfPdf as unknown as jest.Mock<ExtractTransactionOfPdf>;
    extractTransactionOfPdfMock.mockReset();
    extractTransactionOfPdfMock.mockImplementation(() => of(outcome));

    prefillOfExtractionMock = prefillOfExtraction as unknown as jest.Mock<PrefillOfExtraction>;
    prefillOfExtractionMock.mockReset();
    prefillOfExtractionMock.mockReturnValue({prefill: {grossValue: "1700"}, message: {kind: "info", text: "filled"}});

    store = {} as ImportStore;
    args = {
      file: fileFactory(),
      currency: "EUR",
      modelKey: "model-a",
      securitiesByIsin: {[securityReadFactory().isin]: securityReadFactory()}
    };
  });

  it("hands the file, the currency and the model key to the shared extraction", async (): Promise<void> => {
    await run();

    expect(extractTransactionOfPdfMock).toHaveBeenCalledWith({file: args.file, currency: "EUR", modelKey: "model-a"}, {});
    expect(extractTransactionOfPdfMock).toHaveBeenCalledTimes(1);
  });

  it("marks the import as running before the extraction resolves", async (): Promise<void> => {
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
      prefill: {grossValue: "1700"}
    }]);
  });

  it("maps the extraction against the securities and the file it came from", async (): Promise<void> => {
    await run();

    expect(prefillOfExtractionMock).toHaveBeenCalledWith(transaction, ISIN, args.securitiesByIsin, args.file.name);
    expect(prefillOfExtractionMock).toHaveBeenCalledTimes(1);
  });

  describe("refusals that never reach the extraction", (): void => {
    it("refuses a file that is not a PDF", async (): Promise<void> => {
      args = {...args, file: fileFactory({name: "statement.csv", type: "text/csv"})};

      await run();

      expect(patchStateMock.mock.calls).toEqual([
        [store, {busy: false, message: {kind: "error", text: "Only PDF files can be imported."}, prefill: null}]
      ]);
      expect(extractTransactionOfPdfMock).not.toHaveBeenCalled();
    });

    it("refuses to run with no model active", async (): Promise<void> => {
      args = {...args, modelKey: null};

      await run();

      expect(patchStateMock.mock.calls).toEqual([
        [store, {busy: false, message: {kind: "error", text: "No AI model is active."}, prefill: null}]
      ]);
      expect(extractTransactionOfPdfMock).not.toHaveBeenCalled();
    });
  });

  it("reports a document carrying no text layer", async (): Promise<void> => {
    outcome = {status: "parseFailed", failure: {reason: "noTextLayer"}};
    extractTransactionOfPdfMock.mockImplementation(() => of(outcome));

    await run();

    expect(patchStateMock).toHaveBeenCalledTimes(2);
    expect(patchStateMock.mock.calls[1]).toEqual([store, {
      busy: false,
      message: {kind: "error", text: "settlement.pdf carries no readable text."},
      prefill: null
    }]);
  });

  it("reports a document of more pages than can be read", async (): Promise<void> => {
    outcome = {status: "parseFailed", failure: {reason: "tooManyPages", pages: 80, maximum: 50}};
    extractTransactionOfPdfMock.mockImplementation(() => of(outcome));

    await run();

    expect(patchStateMock).toHaveBeenCalledTimes(2);
    expect(patchStateMock.mock.calls[1]).toEqual([store, {
      busy: false,
      message: {kind: "error", text: "settlement.pdf has 80 pages, and at most 50 can be read."},
      prefill: null
    }]);
  });

  it("reports what a failed extraction said, offering no values", async (): Promise<void> => {
    outcome = {status: "failed", message: "The model model-a is not installed."};
    extractTransactionOfPdfMock.mockImplementation(() => of(outcome));

    await run();

    expect(patchStateMock).toHaveBeenCalledTimes(2);
    expect(patchStateMock.mock.calls[1]).toEqual([store, {
      busy: false,
      message: {kind: "error", text: "The model model-a is not installed."},
      prefill: null
    }]);
  });

  it("reports a file it could not read at all", async (): Promise<void> => {
    outcome = {status: "unread"};
    extractTransactionOfPdfMock.mockImplementation(() => of(outcome));

    await run();

    expect(patchStateMock).toHaveBeenCalledTimes(2);
    expect(patchStateMock.mock.calls[1]).toEqual([store, {
      busy: false,
      message: {kind: "error", text: "settlement.pdf could not be read."},
      prefill: null
    }]);
  });

  it("reports a bridge call that failed outright without blaming the document it parsed", async (): Promise<void> => {
    outcome = {status: "refused"};
    extractTransactionOfPdfMock.mockImplementation(() => of(outcome));

    await run();

    expect(patchStateMock).toHaveBeenCalledTimes(2);
    expect(patchStateMock.mock.calls[1]).toEqual([store, {
      busy: false,
      message: {kind: "error", text: "The extraction could not be started. See traquity.log for the reason."},
      prefill: null
    }]);
  });
});
