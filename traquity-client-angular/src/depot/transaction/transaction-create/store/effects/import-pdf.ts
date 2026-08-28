import {patchState} from "@ngrx/signals";
import {RxMethod, rxMethod} from "@ngrx/signals/rxjs-interop";
import {catchError, EMPTY, from, map, Observable, OperatorFunction, pipe, switchMap, tap} from "rxjs";
import {AiBridgeService} from "../../../../../bridge/ai-bridge.service";
import {AiExtractionOutcome} from "../../../../../bridge/ai-bridge.type";
import {
  extractPdf,
  PdfExtractionFailure,
  PdfExtractionResult,
  PdfTransactionReading,
  transactionReadingOfDocument
} from "../../../../../common";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {SecuritiesByIsin} from "../../../../../store/security/selectors/get-securities-by-isin.selector";
import {prefillOfExtraction, PrefillResult} from "./prefill-of-extraction";
import {TransactionImportComputed, TransactionImportState} from "../transaction-import.store";
import {ImportMessage} from "../transaction-import.type";

/** The parts of a file an import reads: the name it carries, the type it states of itself, and its bytes. */
export type ImportedFile = Pick<File, "name" | "type" | "arrayBuffer">;

export type ImportPdfArgs = {
  file: ImportedFile
  /** The three-letter code the extracted transaction is to be denoted in; the depot's own. */
  currency: string
  /** The LLM's catalogue key, or `null` where no model is active. */
  modelKey: string | null
  securitiesByIsin: SecuritiesByIsin
};

const PDF_TYPE: string = "application/pdf";

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
      return from(args.file.arrayBuffer()).pipe(
        switchMap((bytes: ArrayBuffer): Observable<void> => extracted(signalStore, aiBridge, args, modelKey, bytes)),
        catchError((): Observable<void> =>
          finish(signalStore, {kind: "error", text: `${args.file.name} could not be read.`}))
      );
    })
  );
}

function extracted(signalStore: WritableSignalStore<TransactionImportState, TransactionImportComputed>,
                   aiBridge: AiBridgeService, args: ImportPdfArgs, modelKey: string, bytes: ArrayBuffer): Observable<void> {
  return from(extractPdf(bytes, args.currency)).pipe(
    switchMap((result: PdfExtractionResult): Observable<void> => {
      if (result.status === "failed") {
        return finish(signalStore, {kind: "error", text: messageOfFailure(result.failure, args.file.name)});
      }
      const reading: PdfTransactionReading = transactionReadingOfDocument(result.document);
      return aiBridge.extractTransaction({
        document: reading.text,
        tokens: reading.tokens,
        currency: args.currency,
        modelKey
      }).pipe(
        tap((outcome: AiExtractionOutcome): void => applied(signalStore, outcome, reading.isin, args)),
        map((): void => undefined),
        catchError((): Observable<void> => finish(signalStore, {kind: "error", text: EXTRACTION_REFUSED}))
      );
    })
  );
}

function applied(signalStore: WritableSignalStore<TransactionImportState, TransactionImportComputed>,
                 outcome: AiExtractionOutcome, isin: string | undefined, args: ImportPdfArgs): void {
  if (outcome.status === "failed") {
    patchState(signalStore, {busy: false, message: {kind: "error", text: outcome.message}, prefill: null});
    return;
  }
  const result: PrefillResult = prefillOfExtraction(outcome.transaction, isin, args.securitiesByIsin, args.file.name);
  patchState(signalStore, {busy: false, message: result.message, prefill: result.prefill});
}

/** @returns an observable that completes, so a refusal ends the run without emitting anything downstream */
function finish(signalStore: WritableSignalStore<TransactionImportState, TransactionImportComputed>,
                message: ImportMessage): Observable<void> {
  patchState(signalStore, {busy: false, message, prefill: null});
  return EMPTY;
}

/** A dropped file states its own type, and a `.pdf` name is what a chooser leaves where the type is empty. */
function isPdf(file: ImportedFile): boolean {
  return file.type === PDF_TYPE || file.name.toLowerCase().endsWith(".pdf");
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
