import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {patchState, signalState, SignalState} from "@ngrx/signals";
import {Observable, of} from "rxjs";
import {AiBridgeService} from "../../../../../bridge/ai-bridge.service";
import {extractedTransactionFactory} from "../../../../../testing/extracted-transaction.factory";
import {pickedPdfFileFactory} from "../../../../../testing/picked-pdf-file.factory";
import {extractTransactionOfPdf, PdfExtractionAttempt, PdfTransactionOutcome} from "../../../transaction-pdf/extract-transaction-of-pdf";
import {initialState, PickedPdfFile, TransactionPdfImportState} from "../transaction-pdf-import.type";
import {extractFolderPipeline, ExtractFolderArgs} from "./extract-folder";
import {recordOutcome} from "./record-outcome";

jest.mock("../../../transaction-pdf/extract-transaction-of-pdf", (): unknown => ({extractTransactionOfPdf: jest.fn()}));
jest.mock("./record-outcome", (): unknown => ({recordOutcome: jest.fn()}));

type ExtractTransactionOfPdf = (attempt: PdfExtractionAttempt, aiBridge: unknown) => Observable<PdfTransactionOutcome>;
type RecordOutcome = (store: unknown, picked: PickedPdfFile, outcome: PdfTransactionOutcome) => void;

describe("extractFolderPipeline", (): void => {
  let store: SignalState<TransactionPdfImportState>;
  let files: PickedPdfFile[];
  let args: ExtractFolderArgs;
  let extractTransactionOfPdfMock: jest.Mock<ExtractTransactionOfPdf>;
  let recordOutcomeMock: jest.Mock<RecordOutcome>;
  let outcome: PdfTransactionOutcome;

  function run(): Promise<void> {
    return new Promise<void>((resolve): void => {
      of(args).pipe(extractFolderPipeline(store, {} as AiBridgeService)).subscribe({complete: (): void => resolve()});
    });
  }

  beforeEach((): void => {
    files = [
      pickedPdfFileFactory({path: "/a.pdf"}),
      pickedPdfFileFactory({path: "/b.pdf"}),
      pickedPdfFileFactory({path: "/c.pdf"})
    ];
    store = signalState<TransactionPdfImportState>({...initialState, files});
    args = {
      currency: "EUR",
      modelKey: "model-a"
    };

    outcome = {
      status: "extracted",
      transaction: extractedTransactionFactory(),
      isin: undefined
    };

    extractTransactionOfPdfMock = extractTransactionOfPdf as unknown as jest.Mock<ExtractTransactionOfPdf>;
    extractTransactionOfPdfMock.mockReset();
    extractTransactionOfPdfMock.mockImplementation(() => of(outcome));
    recordOutcomeMock = recordOutcome as unknown as jest.Mock<RecordOutcome>;
    recordOutcomeMock.mockReset();
  });

  it("sends one request per file, in order, carrying the currency and model key", async (): Promise<void> => {
    await run();

    const attempts: PdfExtractionAttempt[] =
      extractTransactionOfPdfMock.mock.calls.map(([attempt]: [PdfExtractionAttempt, unknown]): PdfExtractionAttempt => attempt);
    expect(attempts).toEqual([
      {file: files[0].file, currency: "EUR", modelKey: "model-a"},
      {file: files[1].file, currency: "EUR", modelKey: "model-a"},
      {file: files[2].file, currency: "EUR", modelKey: "model-a"}
    ] satisfies PdfExtractionAttempt[]);
  });

  it("records every outcome against the file it came from", async (): Promise<void> => {
    await run();

    expect(recordOutcomeMock.mock.calls).toEqual([
      [store, files[0], outcome],
      [store, files[1], outcome],
      [store, files[2], outcome]
    ]);
  });

  it("names the file currently being read before requesting its extraction", async (): Promise<void> => {
    const seenAt: (string | null)[] = [];
    extractTransactionOfPdfMock.mockImplementation((): Observable<PdfTransactionOutcome> => {
      seenAt.push(store.currentPath());
      return of(outcome);
    });

    await run();

    expect(seenAt).toEqual([
      files[0].path,
      files[1].path,
      files[2].path
    ]);
  });

  it("switches into the extracting phase and back out once every file settled", async (): Promise<void> => {
    const phasesSeen: string[] = [];
    extractTransactionOfPdfMock.mockImplementation((): Observable<PdfTransactionOutcome> => {
      phasesSeen.push(store.phase());
      return of(outcome);
    });

    await run();

    expect(phasesSeen).toEqual(["extracting", "extracting", "extracting"]);
    expect(store.phase()).toBe("extracted");
    expect(store.currentPath()).toBeNull();
  });

  it("does not let one file's outcome stop the ones after it", async (): Promise<void> => {
    extractTransactionOfPdfMock.mockImplementation((attempt: PdfExtractionAttempt): Observable<PdfTransactionOutcome> =>
      of(attempt.file === files[1].file ? {status: "parseFailed", failure: {reason: "noTextLayer"}} : outcome));

    await run();

    const attempts: PdfExtractionAttempt[] =
      extractTransactionOfPdfMock.mock.calls.map(([attempt]: [PdfExtractionAttempt, unknown]): PdfExtractionAttempt => attempt);
    expect(attempts).toEqual([
      {file: files[0].file, currency: "EUR", modelKey: "model-a"},
      {file: files[1].file, currency: "EUR", modelKey: "model-a"},
      {file: files[2].file, currency: "EUR", modelKey: "model-a"}
    ] satisfies PdfExtractionAttempt[]);
  });

  it("stops reading further files once cancelled mid-run, sending no further request", async (): Promise<void> => {
    recordOutcomeMock.mockImplementation((signalStore): void => {
      patchState(signalStore as SignalState<TransactionPdfImportState>, {cancelled: true});
    });

    await run();

    expect(extractTransactionOfPdfMock).toHaveBeenCalledTimes(1);
    expect(extractTransactionOfPdfMock.mock.calls[0][0]).toEqual({
      file: files[0].file,
      currency: "EUR",
      modelKey: "model-a"
    } satisfies PdfExtractionAttempt);
  });
});
