import {RxMethod, rxMethod} from "@ngrx/signals/rxjs-interop";
import {Observable, pipe, switchMap, tap} from "rxjs";
import {WritableSignalStore} from "../../../../common/types/signal-store.type";
import {StartupBridgeService} from "../../../../bridge/startup-bridge.service";
import {ConfigureState} from "../../../../bridge/startup-bridge.type";
import {JavaSettingToVerify} from "../java/effects/verify-java-setting";
import {ConfigureStoreState} from "../configure.store";
import {setConfigureState} from "../methods/set-configure-state";

export function loadConfigureState(signalStore: WritableSignalStore<ConfigureStoreState>,
                                   bridge: Pick<StartupBridgeService, 'getConfigureState'>,
                                   triggerJavaVerification: (setting: JavaSettingToVerify) => void): RxMethod<void> {
  return rxMethod<void>(loadConfigureStatePipe(signalStore, bridge, triggerJavaVerification));
}

/**
 * Loads the frame's own state and, once it has arrived, hands the java setting it carries to the verification
 * trigger it was given - `configure:getState` answers without any I/O of its own, so the setting arrives raw and
 * unverified and the probe it needs is a step of its own.
 */
export function loadConfigureStatePipe(signalStore: WritableSignalStore<ConfigureStoreState>,
                                       bridge: Pick<StartupBridgeService, 'getConfigureState'>,
                                       triggerJavaVerification: (setting: JavaSettingToVerify) => void):
  (source$: Observable<void>) => Observable<ConfigureState> {
  return pipe(
    switchMap((): Observable<ConfigureState> => bridge.getConfigureState()),
    tap((state: ConfigureState): void => setConfigureState(signalStore, state)),
    tap((state: ConfigureState): void => triggerJavaVerification({path: state.java.path, signature: state.java.signature}))
  );
}
