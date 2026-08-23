import {Signal} from "@angular/core";
import {RxMethod, rxMethod} from "@ngrx/signals/rxjs-interop";
import {catchError, exhaustMap, filter, Observable, of, pipe, tap} from "rxjs";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {StartupBridgeService} from "../../../../../bridge/startup-bridge.service";
import {JavaPickResult} from "../../../../../bridge/startup-bridge.type";
import {ConfigureStoreState} from "../../configure.store";
import {rejectJavaPick} from "../methods/reject-java-pick";
import {setJavaSetting} from "../methods/set-java-setting";

export function pickJavaPath(signalStore: WritableSignalStore<ConfigureStoreState>,
                             bridge: Pick<StartupBridgeService, 'pickJava'>,
                             javaPath: Signal<string | null>): RxMethod<void> {
  return rxMethod<void>(pickJavaPathPipe(signalStore, bridge, javaPath));
}

/**
 * Opens the native picker for a java binary, starting from the current setting, and verifies whatever was picked. A
 * successful pick becomes the current setting; a rejected one is recorded under "Custom path…" alone -
 * `setJavaSetting` is deliberately not reached for that branch, so the status line stays exactly as it was. A
 * rejected call changes nothing and, like a cancelled dialog, leaves the picker usable for the next attempt.
 */
export function pickJavaPathPipe(signalStore: WritableSignalStore<ConfigureStoreState>,
                                 bridge: Pick<StartupBridgeService, 'pickJava'>,
                                 javaPath: Signal<string | null>):
  (source$: Observable<void>) => Observable<JavaPickResult> {
  return pipe(
    exhaustMap((): Observable<JavaPickResult | null> => bridge.pickJava(javaPath()).pipe(
      catchError((): Observable<null> => of(null))
    )),
    filter((result: JavaPickResult | null): result is JavaPickResult => result != null),
    tap((result: JavaPickResult): void => {
      if (result.verification.status === 'ok') {
        setJavaSetting(signalStore, result.setting, result.verification, null);
      } else {
        rejectJavaPick(signalStore, result.setting, result.verification.message);
      }
    })
  );
}
