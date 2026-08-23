import {inject} from "@angular/core";
import {map, Observable, of, tap} from "rxjs";
import {StartupBridgeService} from "../../bridge/startup-bridge.service";
import {StartupState} from "../../bridge/startup-bridge.type";
import {ReadableStartupStore, StartupStore} from "./store/startup.store";

/**
 * Resolves the startup state from the bridge into the store, as an app initializer: it has to complete before the
 * router's first navigation, or every routing decision would still read the store's initial phase.
 *
 * Without a bridge (`ng serve`) it completes immediately and writes nothing, leaving the store at its defaults.
 */
export function initializeStartup(): Observable<void> {
  const bridge: StartupBridgeService = inject(StartupBridgeService);
  const store: ReadableStartupStore = inject(StartupStore);
  if (!bridge.available) {
    return of(undefined);
  }
  return bridge.getStartupState().pipe(
    tap((state: StartupState): void => store.setStartupState(state)),
    map((): void => undefined)
  );
}
