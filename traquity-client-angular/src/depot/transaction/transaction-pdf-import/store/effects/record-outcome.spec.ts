import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {signalState, SignalState} from "@ngrx/signals";
import {ExtractedTransaction} from "../../../../../bridge/ai-bridge.type";
import {extractedTransactionFactory} from "../../../../../testing/extracted-transaction.factory";
import {pickedPdfFileFactory} from "../../../../../testing/picked-pdf-file.factory";
import {PdfTransactionOutcome} from "../../../transaction-pdf/extract-transaction-of-pdf";
import {
  CollectedTransaction,
  FaultyFile,
  initialState,
  PdfTransactionDraft,
  PickedPdfFile,
  TransactionPdfImportState
} from "../transaction-pdf-import.type";
import {recordOutcome} from "./record-outcome";
import {transactionOfExtraction} from "./transaction-of-extraction";

jest.mock("./transaction-of-extraction", (): unknown => ({transactionOfExtraction: jest.fn()}));

type TransactionOfExtraction = (extracted: ExtractedTransaction) => PdfTransactionDraft | null;

describe("recordOutcome", (): void => {
  const isin: string = "US0378331005";

  let store: SignalState<TransactionPdfImportState>;
  let picked: PickedPdfFile;
  let transaction: ExtractedTransaction;
  let draft: PdfTransactionDraft;
  let outcome: PdfTransactionOutcome;
  let transactionOfExtractionMock: jest.Mock<TransactionOfExtraction>;

  beforeEach((): void => {
    store = signalState<TransactionPdfImportState>({...initialState});
    picked = pickedPdfFileFactory();
    transaction = extractedTransactionFactory({transactionType: "BUY"});
    draft = {date: "2024-02-02", transactionType: "BUY", securityCountOriginal: 10, grossValue: 1700};
    outcome = {status: "extracted", transaction, isin};

    transactionOfExtractionMock = transactionOfExtraction as unknown as jest.Mock<TransactionOfExtraction>;
    transactionOfExtractionMock.mockReset();
    transactionOfExtractionMock.mockReturnValue(draft);
  });

  it("collects the draft the extraction was turned into, under the document's own path and ISIN", (): void => {
    recordOutcome(store, picked, outcome);

    expect(store.collected()).toEqual([{path: picked.path, isin, draft}] satisfies CollectedTransaction[]);
    expect(store.faulty()).toEqual([]);
    expect(store.filesDone()).toBe(1);
  });

  it("hands the extracted transaction over for the draft exactly once", (): void => {
    recordOutcome(store, picked, outcome);

    expect(transactionOfExtractionMock).toHaveBeenCalledWith(transaction);
    expect(transactionOfExtractionMock).toHaveBeenCalledTimes(1);
  });

  it("is faulty when the document names no ISIN that could be read, without asking for a draft", (): void => {
    outcome = {status: "extracted", transaction, isin: undefined};

    recordOutcome(store, picked, outcome);

    expect(store.faulty()).toEqual([{path: picked.path, reason: "names no ISIN that could be read"}] satisfies FaultyFile[]);
    expect(store.collected()).toEqual([]);
    expect(store.filesDone()).toBe(1);
    expect(transactionOfExtractionMock).not.toHaveBeenCalled();
  });

  it("is faulty when the extraction states no complete transaction", (): void => {
    transactionOfExtractionMock.mockReturnValue(null);

    recordOutcome(store, picked, outcome);

    expect(store.faulty()).toEqual([{path: picked.path, reason: "states no complete transaction"}] satisfies FaultyFile[]);
    expect(store.collected()).toEqual([]);
    expect(store.filesDone()).toBe(1);
  });

  it("is faulty when the file could not be read", (): void => {
    outcome = {status: "unread"};

    recordOutcome(store, picked, outcome);

    expect(store.faulty()).toEqual([{path: picked.path, reason: "could not be read"}] satisfies FaultyFile[]);
    expect(store.filesDone()).toBe(1);
  });

  it("is faulty with no readable text for a parse failure naming a missing text layer", (): void => {
    outcome = {status: "parseFailed", failure: {reason: "noTextLayer"}};

    recordOutcome(store, picked, outcome);

    expect(store.faulty()).toEqual([{path: picked.path, reason: "carries no readable text"}] satisfies FaultyFile[]);
    expect(store.filesDone()).toBe(1);
  });

  it("is faulty with a generic reason for any other parse failure", (): void => {
    outcome = {status: "parseFailed", failure: {reason: "tooManyPages", pages: 80, maximum: 50}};

    recordOutcome(store, picked, outcome);

    expect(store.faulty()).toEqual([{path: picked.path, reason: "could not be read"}] satisfies FaultyFile[]);
    expect(store.filesDone()).toBe(1);
  });

  it("is faulty when the bridge call itself was refused", (): void => {
    outcome = {status: "refused"};

    recordOutcome(store, picked, outcome);

    expect(store.faulty()).toEqual([{path: picked.path, reason: "could not be read"}] satisfies FaultyFile[]);
    expect(store.filesDone()).toBe(1);
  });

  it("is faulty with the model's own message when the model answered a failure", (): void => {
    outcome = {status: "failed", message: "The model model-a is not installed."};

    recordOutcome(store, picked, outcome);

    expect(store.faulty()).toEqual([{path: picked.path, reason: "The model model-a is not installed."}] satisfies FaultyFile[]);
    expect(store.filesDone()).toBe(1);
  });

  it("appends to the existing lists instead of replacing them", (): void => {
    const existing: FaultyFile = {path: picked.path, reason: "could not be read"};
    store = signalState<TransactionPdfImportState>({
      ...initialState,
      faulty: [existing],
      filesDone: 1
    });
    const second: PickedPdfFile = {
      ...picked,
      path: "/statements/other.pdf"
    };

    recordOutcome(store, second, {status: "unread"});

    expect(store.faulty()).toEqual([existing, {path: second.path, reason: "could not be read"}] satisfies FaultyFile[]);
    expect(store.filesDone()).toBe(2);
  });
});
