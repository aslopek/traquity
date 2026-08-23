import {RxMethod, rxMethod} from "@ngrx/signals/rxjs-interop";
import {Observable, pipe, switchMap, tap} from "rxjs";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {StartupBridgeService} from "../../../../../bridge/startup-bridge.service";
import {JavaDownloadProgress} from "../../../../../bridge/startup-bridge.type";
import {ConfigureStoreState} from "../../configure.store";
import {setDownloadProgress} from "../methods/set-download-progress";

export function trackDownloadProgress(signalStore: WritableSignalStore<ConfigureStoreState>,
                                      bridge: Pick<StartupBridgeService, 'javaDownloadProgress$'>): RxMethod<void> {
  return rxMethod<void>(trackDownloadProgressPipe(signalStore, bridge));
}

export function trackDownloadProgressPipe(signalStore: WritableSignalStore<ConfigureStoreState>,
                                          bridge: Pick<StartupBridgeService, 'javaDownloadProgress$'>):
  (source$: Observable<void>) => Observable<JavaDownloadProgress> {
  return pipe(
    switchMap((): Observable<JavaDownloadProgress> => bridge.javaDownloadProgress$),
    tap((progress: JavaDownloadProgress): void => setDownloadProgress(signalStore, progress))
  );
}
