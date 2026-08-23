import {RxMethod, rxMethod} from "@ngrx/signals/rxjs-interop";
import {catchError, exhaustMap, Observable, of, pipe, tap} from "rxjs";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {StartupBridgeService} from "../../../../../bridge/startup-bridge.service";
import {JavaDownloadOutcome} from "../../../../../bridge/startup-bridge.type";
import {ConfigureStoreState} from "../../configure.store";
import {failDownload} from "../methods/fail-download";
import {setDownloadProgress} from "../methods/set-download-progress";
import {setJavaSetting} from "../methods/set-java-setting";

export function downloadCorretto(signalStore: WritableSignalStore<ConfigureStoreState>,
                                 bridge: Pick<StartupBridgeService, 'downloadJava'>): RxMethod<void> {
  return rxMethod<void>(downloadCorrettoPipe(signalStore, bridge));
}

/**
 * Downloads and adopts the Amazon Corretto runtime. `javaDownload` is set before the invoke, not on the first
 * progress event, so `javaValid` blocks "Save & start" for the whole download rather than for a window that starts a
 * moment late. A completed outcome carries the verification of the runtime it put in place, which is adopted as it
 * stands; every other end of the download - a reported failure and a rejected call alike - is recorded as a failure
 * and leaves the current setting exactly as it was.
 */
export function downloadCorrettoPipe(signalStore: WritableSignalStore<ConfigureStoreState>,
                                     bridge: Pick<StartupBridgeService, 'downloadJava'>):
  (source$: Observable<void>) => Observable<JavaDownloadOutcome> {
  return pipe(
    tap((): void => setDownloadProgress(signalStore, {
      phase: 'downloading',
      receivedBytes: 0,
      totalBytes: null,
      bytesPerSecond: 0,
      secondsRemaining: null
    })),
    exhaustMap((): Observable<JavaDownloadOutcome> => bridge.downloadJava().pipe(
      catchError((error: unknown): Observable<JavaDownloadOutcome> =>
        of({status: 'failed', message: error instanceof Error ? error.message : String(error)}))
    )),
    tap((result: JavaDownloadOutcome): void => {
      if (result.status === 'completed') {
        setJavaSetting(signalStore, result.javaPath, result.verification, result.signature);
      } else {
        failDownload(signalStore, result.message);
      }
    })
  );
}
