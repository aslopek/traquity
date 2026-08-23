import {RxMethod, rxMethod} from "@ngrx/signals/rxjs-interop";
import {catchError, debounceTime, filter, Observable, of, pipe, switchMap, tap} from "rxjs";
import {WritableSignalStore} from "../../../../common/types/signal-store.type";
import {StartupBridgeService} from "../../../../bridge/startup-bridge.service";
import {ReadableStartupStore} from "../../../startup/store/startup.store";
import {setPasswordMatches} from "../methods/set-password-matches";
import {UnlockState} from "../unlock.store";

/**
 * `scryptSync` runs synchronously in the Electron main process (cost 16384 ≈ tens of milliseconds of blocked main
 * thread), so an un-debounced call per keystroke would visibly stutter the window.
 */
export const PASSWORD_VERITQ_DEBOUNCE_MS: number = 200;

export function verifyPassword(signalStore: WritableSignalStore<UnlockState>,
                               bridge: Pick<StartupBridgeService, 'verifyPassword'>,
                               startupStore: Pick<ReadableStartupStore, 'authState'>): RxMethod<string> {
  return rxMethod<string>(verifyPasswordPipe(signalStore, bridge, startupStore));
}

/**
 * The pure operator pipeline, separated from `rxMethod` so it can be driven directly with marbles: `rxMethod` itself
 * requires an Angular injection context and subscribes eagerly, neither of which a plain marble test can provide.
 */
export function verifyPasswordPipe(signalStore: WritableSignalStore<UnlockState>,
                                   bridge: Pick<StartupBridgeService, 'verifyPassword'>,
                                   startupStore: Pick<ReadableStartupStore, 'authState'>):
  (source$: Observable<string>) => Observable<boolean> {
  return pipe(
    // a pending database has nothing to verify against - skipping the round trip is cheaper than relying on
    // verifyPassword returning false for a missing entry
    filter((): boolean => startupStore.authState() === 'scrypt'),
    debounceTime(PASSWORD_VERITQ_DEBOUNCE_MS),
    // switchMap, not exhaustMap: the newest keystroke's answer is the only one that may win
    switchMap((password: string): Observable<boolean> => bridge.verifyPassword(password).pipe(
      // a bridge rejection must leave OK disabled, never enabled
      catchError((): Observable<boolean> => of(false))
    )),
    tap((matches: boolean): void => setPasswordMatches(signalStore, matches))
  );
}
