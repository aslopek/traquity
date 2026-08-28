import {patchState} from "@ngrx/signals";
import {RxMethod, rxMethod} from "@ngrx/signals/rxjs-interop";
import {catchError, EMPTY, from, map, Observable, OperatorFunction, pipe, switchMap, tap} from "rxjs";
import {AiBridgeService} from "../../../../../bridge/ai-bridge.service";
import {AiExtractionOutcome} from "../../../../../bridge/ai-bridge.type";
import {extractPdf, PdfExtractionFailure, PdfExtractionResult} from "../../../../../common/pdf/extract-pdf";
import {renderPdfDocument} from "../../../../../common/pdf/render-pdf-document";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {SecuritiesByIsin} from "../../../../../store/security/selectors/get-securities-by-isin.selector";
import {prefillOfExtraction, PrefillResult} from "../prefill-of-extraction";
import {TransactionImportComputed, TransactionImportState} from "../transaction-import.store";
import {ImportMessage} from "../transaction-import.type";

export type ImportPdfArgs = {
  file: File
  /** The three-letter code the amounts are to be read in; the depot's own. */
  currency: string
  /** The active model's catalogue key, or `null` where no model is active. */
  modelKey: string | null
  securitiesByIsin: SecuritiesByIsin
};

const PDF_TYPE: string = "application/pdf";

/**
 * One document, from the file the user handed over to the values the form offers.
 *
 * The parse happens here, in the renderer: a file that is not a PDF, one the parser cannot open and one carrying no
 * text at all are each answered on the screen the user is standing on, and none of them reaches the bridge. Only
 * the extracted document crosses it.
 */
export function importPdf(signalStore: WritableSignalStore<TransactionImportState, TransactionImportComputed>,
                          aiBridge: AiBridgeService): RxMethod<ImportPdfArgs> {
  return rxMethod<ImportPdfArgs>(importPdfPipeline(signalStore, aiBridge));
}

/**
 * The run itself, as an operator over the requests. It is separate from `importPdf` because `rxMethod` needs an
 * injection context and this does not: a spec drives it by piping into it, without an Angular environment.
 *
 * It cannot be marble-tested the way a purely operator-driven effect is: pdf.js and `File.arrayBuffer` are both
 * promises, and a promise settles on the microtask queue, which virtual time does not observe.
 */
export function importPdfPipeline(signalStore: WritableSignalStore<TransactionImportState, TransactionImportComputed>,
                                  aiBridge: AiBridgeService): OperatorFunction<ImportPdfArgs, void> {
  return pipe(
    switchMap((args: ImportPdfArgs): Observable<void> => {
      if (!isPdf(args.file)) {
        return finish(signalStore, {kind: "error", text: "Only PDF files can be imported."});
      }
      if (args.modelKey == null) {
        return finish(signalStore, {kind: "error", text: "No AI model is active."});
      }

      patchState(signalStore, {busy: true, message: null, prefill: null});
      return from(args.file.arrayBuffer()).pipe(
        switchMap((bytes: ArrayBuffer): Observable<void> => extracted(signalStore, aiBridge, args, bytes)),
        catchError((): Observable<void> =>
          finish(signalStore, {kind: "error", text: `${args.file.name} could not be read.`}))
      );
    })
  );
}

function extracted(signalStore: WritableSignalStore<TransactionImportState, TransactionImportComputed>,
                   aiBridge: AiBridgeService, args: ImportPdfArgs, bytes: ArrayBuffer): Observable<void> {
  return from(extractPdf(bytes)).pipe(
    switchMap((result: PdfExtractionResult): Observable<void> => {
      if (result.status === "failed") {
        return finish(signalStore, {kind: "error", text: messageOfFailure(result.failure, args.file.name)});
      }
      return aiBridge.extractTransaction({
        document: renderPdfDocument(result.document, {table: true}),
        currency: args.currency,
        modelKey: args.modelKey as string
      }).pipe(
        tap((outcome: AiExtractionOutcome): void => applied(signalStore, outcome, args)),
        map((): void => undefined)
      );
    })
  );
}

function applied(signalStore: WritableSignalStore<TransactionImportState, TransactionImportComputed>,
                 outcome: AiExtractionOutcome, args: ImportPdfArgs): void {
  if (outcome.status === "failed") {
    patchState(signalStore, {busy: false, message: {kind: "error", text: outcome.message}, prefill: null});
    return;
  }
  const result: PrefillResult = prefillOfExtraction(outcome.transaction, args.securitiesByIsin, args.file.name);
  patchState(signalStore, {busy: false, message: result.message, prefill: result.prefill});
}

/** @returns an observable that completes, so a refusal ends the run without emitting anything downstream */
function finish(signalStore: WritableSignalStore<TransactionImportState, TransactionImportComputed>,
                message: ImportMessage): Observable<void> {
  patchState(signalStore, {busy: false, message, prefill: null});
  return EMPTY;
}

/** A dropped file states its own type, and a `.pdf` name is what a chooser leaves where the type is empty. */
function isPdf(file: File): boolean {
  return file.type === PDF_TYPE || file.name.toLowerCase().endsWith(".pdf");
}

function messageOfFailure(failure: PdfExtractionFailure, fileName: string): string {
  switch (failure.reason) {
    case "notAPdf":
      return "Only PDF files can be imported.";
    case "noTextLayer":
      return `${fileName} carries no readable text. Scanned documents are not supported.`;
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
