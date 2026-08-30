import {RxMethod, rxMethod} from "@ngrx/signals/rxjs-interop";
import {catchError, exhaustMap, Observable, of, pipe, tap} from "rxjs";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {StartupBridgeService} from "../../../../../bridge/startup-bridge.service";
import {JavaVerification} from "../../../../../bridge/startup-bridge.type";
import {ConfigureStoreState} from "../../configure.store";
import {startJavaVerification} from "../methods/start-java-verification";
import {setJavaSetting} from "../methods/set-java-setting";

/** What is being verified, and the signature to keep alongside it once the verification lands. */
export type JavaSettingToVerify = {
  path: string | null
  signature: string | null
};

export function verifyJavaSetting(signalStore: WritableSignalStore<ConfigureStoreState>,
                                  bridge: Pick<StartupBridgeService, 'verifyJava'>): RxMethod<JavaSettingToVerify> {
  return rxMethod<JavaSettingToVerify>(verifyJavaSettingPipe(signalStore, bridge));
}

/**
 * Verifies exactly the setting handed in - `null` means the `PATH` candidate - and adopts the result as the current
 * setting. The signature to keep travels alongside the path rather than being looked up here, so that a setting
 * whose origin only the trigger knows keeps its own. A rejected call is an unverified setting like any other: it
 * ends the pending state with an error rather than leaving the section verifying forever.
 */
export function verifyJavaSettingPipe(signalStore: WritableSignalStore<ConfigureStoreState>,
                                      bridge: Pick<StartupBridgeService, 'verifyJava'>):
  (source$: Observable<JavaSettingToVerify>) => Observable<JavaVerification> {
  return pipe(
    tap((): void => startJavaVerification(signalStore)),
    exhaustMap(({path, signature}: JavaSettingToVerify): Observable<JavaVerification> =>
      bridge.verifyJava(path).pipe(
        catchError((error: unknown): Observable<JavaVerification> =>
          of({status: 'error', message: error instanceof Error ? error.message : String(error)})),
        tap((verification: JavaVerification): void => setJavaSetting(signalStore, path, verification, signature))
      ))
  );
}
