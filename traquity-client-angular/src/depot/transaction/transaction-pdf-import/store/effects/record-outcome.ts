import {patchState} from "@ngrx/signals";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {PdfTransactionOutcome} from "../../../transaction-pdf/extract-transaction-of-pdf";
import {
  CollectedTransaction,
  FaultyFile,
  PdfTransactionDraft,
  PickedPdfFile,
  TransactionPdfImportState
} from "../transaction-pdf-import.type";
import {transactionOfExtraction} from "./transaction-of-extraction";

type Faulty = Exclude<PdfTransactionOutcome, { status: "extracted" }>;

export function recordOutcome(signalStore: WritableSignalStore<TransactionPdfImportState>, picked: PickedPdfFile,
                              outcome: PdfTransactionOutcome): void {
  if (outcome.status !== "extracted") {
    recordFaulty(signalStore, picked, reasonOf(outcome));
    return;
  }
  if (outcome.isin === undefined) {
    recordFaulty(signalStore, picked, "names no ISIN that could be read");
    return;
  }
  const draft: PdfTransactionDraft | null = transactionOfExtraction(outcome.transaction);
  if (draft === null) {
    recordFaulty(signalStore, picked, "states no complete transaction");
    return;
  }

  const collected: CollectedTransaction = {
    path: picked.path,
    isin: outcome.isin,
    draft
  };
  patchState(signalStore, {
    collected: [
      ...signalStore.collected(),
      collected
    ],
    filesDone: signalStore.filesDone() + 1
  });
}

function recordFaulty(signalStore: WritableSignalStore<TransactionPdfImportState>, picked: PickedPdfFile, reason: string): void {
  const faulty: FaultyFile = {path: picked.path, reason};
  patchState(signalStore, {
    faulty: [
      ...signalStore.faulty(),
      faulty
    ],
    filesDone: signalStore.filesDone() + 1
  });
}

function reasonOf(outcome: Faulty): string {
  switch (outcome.status) {
    case "unread":
    case "refused":
      return "could not be read";
    case "parseFailed":
      return outcome.failure.reason === "noTextLayer" ? "carries no readable text" : "could not be read";
    case "failed":
      return outcome.message;
  }
}
