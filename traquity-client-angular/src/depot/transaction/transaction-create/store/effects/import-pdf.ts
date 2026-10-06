import {patchState} from "@ngrx/signals";
import {RxMethod, rxMethod} from "@ngrx/signals/rxjs-interop";
import {EMPTY, Observable, OperatorFunction, pipe, switchMap} from "rxjs";
import {AiBridgeService} from "../../../../../bridge/ai-bridge.service";
import {PdfExtractionFailure} from "../../../../../common/pdf/extract-pdf";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {SecuritiesByIsin} from "../../../../../store/security/selectors/get-securities-by-isin.selector";
import {extractTransactionOfPdf, PdfTransactionOutcome} from "../../../transaction-pdf/extract-transaction-of-pdf";
import {ImportedFile, isPdf} from "../../../transaction-pdf/imported-file";
import {prefillOfExtraction, PrefillResult} from "./prefill-of-extraction";
import {TransactionImportComputed, TransactionImportState} from "../transaction-import.store";
import {ImportMessage} from "../transaction-import.type";

export type ImportPdfArgs = {
  file: ImportedFile
  /** The three-letter code the extracted transaction is to be denoted in; the depot's own. */
  currency: string
  /** The LLM's catalogue key, or `null` where no model is active. */
  modelKey: string | null
  securitiesByIsin: SecuritiesByIsin
};

/**
 * What a bridge call that reached no outcome at all is answered with. Such a call carries no message of its own,
 * and it names no document, since the parse already succeeded.
 */
const EXTRACTION_REFUSED: string = "The extraction could not be started. See traquity.log for the reason.";

/**
 * One document, from the file the user handed over to the values the form offers. The parse happens here, so a file
 * the parser refuses never reaches the bridge; only the extracted document crosses it.
 */
export function importPdf(signalStore: WritableSignalStore<TransactionImportState, TransactionImportComputed>,
                          aiBridge: AiBridgeService): RxMethod<ImportPdfArgs> {
  return rxMethod<ImportPdfArgs>(importPdfPipeline(signalStore, aiBridge));
}

export function importPdfPipeline(signalStore: WritableSignalStore<TransactionImportState, TransactionImportComputed>,
                                  aiBridge: AiBridgeService): OperatorFunction<ImportPdfArgs, void> {
  return pipe(
    switchMap((args: ImportPdfArgs): Observable<void> => {
      if (!isPdf(args.file)) {
        return finish(signalStore, {kind: "error", text: "Only PDF files can be imported."});
      }
      const modelKey: string | null = args.modelKey;
      if (modelKey == null) {
        return finish(signalStore, {kind: "error", text: "No AI model is active."});
      }

      patchState(signalStore, {busy: true, message: null, prefill: null});
      return extractTransactionOfPdf({file: args.file, currency: args.currency, modelKey}, aiBridge).pipe(
        switchMap((outcome: PdfTransactionOutcome): Observable<void> => apply(signalStore, outcome, args))
      );
    })
  );
}

/** Turns an extraction outcome into an error message or a form prefill, and patches the store with the result. */
function apply(signalStore: WritableSignalStore<TransactionImportState, TransactionImportComputed>,
               outcome: PdfTransactionOutcome, args: ImportPdfArgs): Observable<void> {
  switch (outcome.status) {
    case "unread":
      return finish(signalStore, {kind: "error", text: `${args.file.name} could not be read.`});
    case "parseFailed":
      return finish(signalStore, {kind: "error", text: messageOfFailure(outcome.failure, args.file.name)});
    case "refused":
      return finish(signalStore, {kind: "error", text: EXTRACTION_REFUSED});
    case "failed":
      return finish(signalStore, {kind: "error", text: outcome.message});
    case "extracted": {
      const result: PrefillResult = prefillOfExtraction(outcome.transaction, outcome.isin, args.securitiesByIsin, args.file.name);
      patchState(signalStore, {busy: false, message: result.message, prefill: result.prefill});
      return EMPTY;
    }
  }
}

/** @returns an observable that completes, so a refusal ends the run without emitting anything downstream */
function finish(signalStore: WritableSignalStore<TransactionImportState, TransactionImportComputed>,
                message: ImportMessage): Observable<void> {
  patchState(signalStore, {busy: false, message, prefill: null});
  return EMPTY;
}

function messageOfFailure(failure: PdfExtractionFailure, fileName: string): string {
  switch (failure.reason) {
    case "notAPdf":
      return "Only PDF files can be imported.";
    case "noTextLayer":
      return `${fileName} carries no readable text.`;
    case "tooManyPages":
      return `${fileName} has ${failure.pages} pages, and at most ${failure.maximum} can be read.`;
    case "tooManyRuns":
      return `${fileName} carries more text than can be read.`;
    case "outOfTime":
      return `${fileName} took too long to read.`;
    case "unreadable":
      return `${fileName} could not be read.`;
  }
}
