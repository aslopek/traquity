import {inject, Signal} from "@angular/core";
import {signalStore, withComputed, withMethods, withState} from "@ngrx/signals";
import {RxMethod} from "@ngrx/signals/rxjs-interop";
import {ReadableSignalStore, WritableSignalStore} from "../../../common/types/signal-store.type";
import {StartupBridgeService} from "../../../bridge/startup-bridge.service";
import {ReadableStartupStore, StartupStore} from "../../startup/store/startup.store";
import {canSubmit} from "./computed/can-submit";
import {verifyPassword} from "./effects/verify-password";
import {setPassword} from "./methods/set-password";
import {submit} from "./methods/submit";
import {togglePasswordVisibility} from "./methods/toggle-password-visibility";

export type UnlockState = {
  password: string
  passwordMatches: boolean
  passwordVisible: boolean
};

export const initialState: UnlockState = {
  password: '',
  passwordMatches: false,
  passwordVisible: false
} as const;

export type UnlockComputed = {
  canSubmit: Signal<boolean>
};

export type UnlockMethods = {
  cancel: () => void
  setPassword: (password: string) => void
  submit: () => void
  togglePasswordVisibility: () => void
  useDifferentDatabase: () => void
};

export type ReadableUnlockStore = ReadableSignalStore<UnlockState, UnlockComputed, UnlockMethods>;

export const UnlockStore = signalStore(
  withState(initialState),
  withComputed((signalStore: ReadableSignalStore<UnlockState>): UnlockComputed => {
    const startupStore: ReadableStartupStore = inject(StartupStore);
    return {
      canSubmit: canSubmit(signalStore, startupStore)
    };
  }),
  withMethods((signalStore: WritableSignalStore<UnlockState, UnlockComputed>): UnlockMethods => {
    const bridge: StartupBridgeService = inject(StartupBridgeService);
    const startupStore: ReadableStartupStore = inject(StartupStore);
    const verifyPasswordMethod: RxMethod<string> = verifyPassword(signalStore, bridge, startupStore);
    return {
      cancel: (): void => bridge.quit(),
      setPassword: (password: string): void => {
        setPassword(signalStore, password);
        verifyPasswordMethod(password);
      },
      submit: (): void => submit(signalStore, startupStore),
      togglePasswordVisibility: (): void => togglePasswordVisibility(signalStore),
      useDifferentDatabase: (): void => startupStore.enterConfigure()
    };
  })
);
