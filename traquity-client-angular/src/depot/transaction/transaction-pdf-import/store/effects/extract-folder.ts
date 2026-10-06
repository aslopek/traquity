import {patchState} from "@ngrx/signals";
import {RxMethod, rxMethod} from "@ngrx/signals/rxjs-interop";
import {concatMap, defer, EMPTY, finalize, from, map, Observable, OperatorFunction, pipe, switchMap, tap} from "rxjs";
import {AiBridgeService} from "../../../../../bridge/ai-bridge.service";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {extractTransactionOfPdf, PdfTransactionOutcome} from "../../../transaction-pdf/extract-transaction-of-pdf";
import {PickedPdfFile, TransactionPdfImportState} from "../transaction-pdf-import.type";
import {recordOutcome} from "./record-outcome";

export type ExtractFolderArgs = {
  currency: string
  modelKey: string
};

export function extractFolder(signalStore: WritableSignalStore<TransactionPdfImportState>,
                              aiBridge: Pick<AiBridgeService, "extractTransaction">): RxMethod<ExtractFolderArgs> {
  return rxMethod<ExtractFolderArgs>(extractFolderPipeline(signalStore, aiBridge));
}

export function extractFolderPipeline(signalStore: WritableSignalStore<TransactionPdfImportState>,
                                      aiBridge: Pick<AiBridgeService, "extractTransaction">): OperatorFunction<ExtractFolderArgs, void> {
  return pipe(
    switchMap((args: ExtractFolderArgs): Observable<void> => {
      patchState(signalStore, {phase: "extracting"});
      return from(signalStore.files()).pipe(
        concatMap((picked: PickedPdfFile): Observable<PdfTransactionOutcome> => extractOneFile(signalStore, aiBridge, args, picked)),
        map((): void => undefined),
        finalize((): void => patchState(signalStore, {phase: "extracted", currentPath: null}))
      );
    })
  );
}

function extractOneFile(signalStore: WritableSignalStore<TransactionPdfImportState>,
                        aiBridge: Pick<AiBridgeService, "extractTransaction">,
                        args: ExtractFolderArgs,
                        picked: PickedPdfFile): Observable<PdfTransactionOutcome> {
  if (signalStore.cancelled()) {
    return EMPTY;
  }
  return defer((): Observable<PdfTransactionOutcome> => {
    patchState(signalStore, {currentPath: picked.path});
    return extractTransactionOfPdf({
      file: picked.file,
      currency: args.currency,
      modelKey: args.modelKey
    }, aiBridge);
  }).pipe(tap((outcome: PdfTransactionOutcome): void => recordOutcome(signalStore, picked, outcome)));
}
