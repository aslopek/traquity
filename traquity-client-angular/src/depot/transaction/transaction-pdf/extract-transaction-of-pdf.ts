import {catchError, from, map, Observable, of, switchMap} from "rxjs";
import {AiBridgeService} from "../../../bridge/ai-bridge.service";
import {AiExtractionOutcome, ExtractedTransaction} from "../../../bridge/ai-bridge.type";
import {extractPdf, PdfExtractionFailure, PdfExtractionResult} from "../../../common/pdf/extract-pdf";
import {PdfTransactionReading, transactionReadingOfDocument} from "../../../common/pdf/transaction-reading-of-document";
import {ImportedFile} from "./imported-file";

export type PdfExtractionAttempt = {
  file: ImportedFile
  /** The three-letter code amounts of this document may be denoted in. */
  currency: string
  /** The catalogue key of the model that answers. */
  modelKey: string
};

/**
 * What one document yielded. Every way it can end is a case of its own, distinguishable without reading a message,
 * so a caller puts its own wording on it.
 */
export type PdfTransactionOutcome =
  | { status: "extracted", transaction: ExtractedTransaction, isin: string | undefined }
  | { status: "unread" }
  | { status: "parseFailed", failure: PdfExtractionFailure }
  | { status: "refused" }
  | { status: "failed", message: string };

/** One document, from its bytes to what a model stated about it. Emits exactly one outcome and completes. */
export function extractTransactionOfPdf(attempt: PdfExtractionAttempt,
                                        aiBridge: Pick<AiBridgeService, "extractTransaction">): Observable<PdfTransactionOutcome> {
  return from(attempt.file.arrayBuffer()).pipe(
    switchMap((bytes: ArrayBuffer): Observable<PdfTransactionOutcome> => parsed(attempt, aiBridge, bytes)),
    catchError((): Observable<PdfTransactionOutcome> => of({status: "unread"}))
  );
}

function parsed(attempt: PdfExtractionAttempt, aiBridge: Pick<AiBridgeService, "extractTransaction">,
                bytes: ArrayBuffer): Observable<PdfTransactionOutcome> {
  return from(extractPdf(bytes, attempt.currency)).pipe(
    switchMap((result: PdfExtractionResult): Observable<PdfTransactionOutcome> => {
      if (result.status === "failed") {
        return of({status: "parseFailed", failure: result.failure});
      }
      const reading: PdfTransactionReading = transactionReadingOfDocument(result.document);
      return aiBridge.extractTransaction({
        document: reading.text,
        tokens: reading.tokens,
        currency: attempt.currency,
        modelKey: attempt.modelKey
      }).pipe(
        map((outcome: AiExtractionOutcome): PdfTransactionOutcome => outcome.status === "failed"
          ? {status: "failed", message: outcome.message}
          : {status: "extracted", transaction: outcome.transaction, isin: reading.isin}),
        catchError((): Observable<PdfTransactionOutcome> => of({status: "refused"}))
      );
    })
  );
}
