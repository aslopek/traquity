import {inject, Signal} from "@angular/core";
import {signalStore, withComputed, withHooks, withMethods, withState} from "@ngrx/signals";
import {RxMethod} from "@ngrx/signals/rxjs-interop";
import {ReadableSignalStore, WritableSignalStore} from "../../../common/types/signal-store.type";
import {StartupBridgeService} from "../../../bridge/startup-bridge.service";
import {AuthState, ConfigFileState, JavaDownloadProgress, JavaVerification, KnownDatabase} from "../../../bridge/startup-bridge.type";
import {ReadableStartupStore, StartupStore} from "../../startup/store/startup.store";
import {configUnreadable} from "./computed/config-unreadable";
import {enableDiscardAndStart} from "./computed/enable-discard-and-start";
import {enableSaveAndStart} from "./computed/enable-save-and-start";
import {canForgetPassword} from "./database/computed/can-forget-password";
import {databaseValid} from "./database/computed/database-valid";
import {definesPassword} from "./database/computed/defines-password";
import {knownDatabasesDisabled} from "./database/computed/known-databases-disabled";
import {passwordMismatch} from "./database/computed/password-mismatch";
import {passwordlessWarning} from "./database/computed/passwordless-warning";
import {selectedAuthState} from "./database/computed/selected-auth-state";
import {selectedKnownDatabasePath} from "./database/computed/selected-known-database-path";
import {forgetPassword} from "./database/effects/forget-password";
import {pickExistingDatabase} from "./database/effects/pick-existing-database";
import {pickNewDatabase} from "./database/effects/pick-new-database";
import {initializeSelection} from "./database/methods/initialize-selection";
import {selectKnownDatabase} from "./database/methods/select-known-database";
import {setPassword} from "./database/methods/set-password";
import {setPasswordConfirmation} from "./database/methods/set-password-confirmation";
import {togglePasswordVisibility} from "./database/methods/toggle-password-visibility";
import {loadConfigureState} from "./effects/load-configure-state";
import {saveAndStart} from "./effects/save-and-start";
import {javaSelection, JavaSelection} from "./java/computed/java-selection";
import {javaValid} from "./java/computed/java-valid";
import {javaVerifying} from "./java/computed/java-verifying";
import {downloadCorretto} from "./java/effects/download-corretto";
import {pickJavaPath} from "./java/effects/pick-java-path";
import {trackDownloadProgress} from "./java/effects/track-download-progress";
import {verifyJavaSetting} from "./java/effects/verify-java-setting";
import {JavaPickError} from "./java/java-pick-error.type";
import {dismissLicenseNote} from "./java/methods/dismiss-license-note";
import {showLicenseNote} from "./java/methods/show-license-note";
import {discardAndStart} from "./methods/discard-and-start";
import {SelectionOrigin} from "./routing/next-startup-step";

/**
 * The configuration screen's own state, computeds and methods, each split into one slice per owner: the frame, and
 * one per section (`Database*`, `Java*`). The slices are a reading aid and nothing else - the exported types
 * intersect them back into one flat object, which is what the store, its computeds and its methods see. Nothing
 * outside this file names a slice, so moving a property from one to another is a rename of a comment, not a change
 * to any signature.
 *
 * The same split runs through the folders: a section's own computeds, effects and methods live under `<section>/`
 * (`database/`, `java/`), while the `computed/`, `effects/` and `methods/` folders next to this file hold the
 * frame's own - the notices, the two finish buttons and the state every section shares.
 */

type FrameState = {
  configFileState: ConfigFileState
  logPath: string
};

type DatabaseState = {
  knownDatabases: KnownDatabase[]
  password: string
  passwordConfirmation: string
  passwordVisible: boolean
  selectedDatabasePath: string | null
  selectionOrigin: SelectionOrigin
};

type JavaState = {
  javaPath: string | null
  javaSignature: string | null
  javaVerification: JavaVerification | null
  javaPickError: JavaPickError | null
  licenseNoteVisible: boolean
  javaDownload: JavaDownloadProgress | null
  javaDownloadError: string | null
};

export type ConfigureStoreState = FrameState & DatabaseState & JavaState;

export const initialState: ConfigureStoreState = {
  configFileState: 'missing',
  logPath: '',
  knownDatabases: [],
  password: '',
  passwordConfirmation: '',
  passwordVisible: false,
  selectedDatabasePath: null,
  selectionOrigin: 'unchanged',
  javaPath: null,
  javaSignature: null,
  javaVerification: null,
  javaPickError: null,
  licenseNoteVisible: false,
  javaDownload: null,
  javaDownloadError: null
} as const;

type FrameComputed = {
  configUnreadable: Signal<boolean>
  enableDiscardAndStart: Signal<boolean>
  enableSaveAndStart: Signal<boolean>
};

type DatabaseComputed = {
  canForgetPassword: Signal<boolean>
  databaseValid: Signal<boolean>
  definesPassword: Signal<boolean>
  knownDatabasesDisabled: Signal<boolean>
  passwordMismatch: Signal<boolean>
  passwordlessWarning: Signal<boolean>
  selectedAuthState: Signal<AuthState>
  selectedKnownDatabasePath: Signal<string | null>
};

type JavaComputed = {
  javaSelection: Signal<JavaSelection>
  javaValid: Signal<boolean>
  javaVerifying: Signal<boolean>
};

export type ConfigureComputed = FrameComputed & DatabaseComputed & JavaComputed;

type FrameMethods = {
  discardAndStart: () => void
  saveAndStart: () => void
};

type DatabaseMethods = {
  forgetPassword: () => void
  pickExistingDatabase: () => void
  pickNewDatabase: () => void
  selectKnownDatabase: (databasePath: string) => void
  setPassword: (password: string) => void
  setPasswordConfirmation: (passwordConfirmation: string) => void
  togglePasswordVisibility: () => void
};

type JavaMethods = {
  confirmJavaDownload: () => void
  dismissJavaLicenseNote: () => void
  pickJavaPath: () => void
  selectAutomaticJava: () => void
  showJavaLicenseNote: () => void
};

export type ConfigureMethods = FrameMethods & DatabaseMethods & JavaMethods;

export type ReadableConfigureStore = ReadableSignalStore<ConfigureStoreState, ConfigureComputed, ConfigureMethods>;

export const ConfigureStore = signalStore(
  withState(initialState),
  withComputed((signalStore: ReadableSignalStore<ConfigureStoreState>): ConfigureComputed => {
    const startupStore: ReadableStartupStore = inject(StartupStore);
    const selectedAuthStateSignal: Signal<AuthState> = selectedAuthState(signalStore);
    const definesPasswordSignal: Signal<boolean> = definesPassword(signalStore);
    const databaseValidSignal: Signal<boolean> = databaseValid(signalStore);
    const javaValidSignal: Signal<boolean> = javaValid(signalStore);
    return {
      canForgetPassword: canForgetPassword(selectedAuthStateSignal),
      configUnreadable: configUnreadable(signalStore),
      databaseValid: databaseValidSignal,
      definesPassword: definesPasswordSignal,
      enableDiscardAndStart: enableDiscardAndStart(signalStore, startupStore),
      enableSaveAndStart: enableSaveAndStart(databaseValidSignal, javaValidSignal),
      javaSelection: javaSelection(signalStore),
      javaValid: javaValidSignal,
      javaVerifying: javaVerifying(signalStore),
      knownDatabasesDisabled: knownDatabasesDisabled(signalStore),
      passwordMismatch: passwordMismatch(signalStore, definesPasswordSignal),
      passwordlessWarning: passwordlessWarning(signalStore, definesPasswordSignal),
      selectedAuthState: selectedAuthStateSignal,
      selectedKnownDatabasePath: selectedKnownDatabasePath(signalStore, selectedAuthStateSignal)
    };
  }),
  withMethods((signalStore: WritableSignalStore<ConfigureStoreState, ConfigureComputed>): ConfigureMethods => {
    const bridge: StartupBridgeService = inject(StartupBridgeService);
    const startupStore: ReadableStartupStore = inject(StartupStore);
    const pickExistingDatabaseMethod: RxMethod<void> =
      pickExistingDatabase(signalStore, bridge, signalStore.selectedDatabasePath);
    const pickNewDatabaseMethod: RxMethod<void> = pickNewDatabase(signalStore, bridge, signalStore.selectedDatabasePath);
    const forgetPasswordMethod: RxMethod<void> = forgetPassword(signalStore, bridge, signalStore.selectedDatabasePath);
    const saveAndStartMethod: RxMethod<void> =
      saveAndStart(signalStore, bridge, startupStore, signalStore.selectedDatabasePath, signalStore.javaPath, signalStore.javaSignature);
    const verifyJavaSettingMethod: RxMethod<{ path: string | null, signature: string | null }> = verifyJavaSetting(signalStore, bridge);
    const pickJavaPathMethod: RxMethod<void> = pickJavaPath(signalStore, bridge, signalStore.javaPath);
    const downloadCorrettoMethod: RxMethod<void> = downloadCorretto(signalStore, bridge);
    return {
      confirmJavaDownload: (): void => {
        dismissLicenseNote(signalStore);
        downloadCorrettoMethod();
      },
      discardAndStart: (): void => discardAndStart(signalStore, startupStore),
      dismissJavaLicenseNote: (): void => dismissLicenseNote(signalStore),
      forgetPassword: (): void => {
        forgetPasswordMethod();
      },
      pickExistingDatabase: (): void => {
        pickExistingDatabaseMethod();
      },
      pickJavaPath: (): void => {
        pickJavaPathMethod();
      },
      pickNewDatabase: (): void => {
        pickNewDatabaseMethod();
      },
      saveAndStart: (): void => {
        saveAndStartMethod();
      },
      selectAutomaticJava: (): void => {
        verifyJavaSettingMethod({path: null, signature: null});
      },
      selectKnownDatabase: (databasePath: string): void => selectKnownDatabase(signalStore, databasePath),
      setPassword: (password: string): void => setPassword(signalStore, password),
      setPasswordConfirmation: (passwordConfirmation: string): void => setPasswordConfirmation(signalStore, passwordConfirmation),
      showJavaLicenseNote: (): void => showLicenseNote(signalStore),
      togglePasswordVisibility: (): void => togglePasswordVisibility(signalStore)
    };
  }),
  withHooks({
    onInit(signalStore: WritableSignalStore<ConfigureStoreState, ConfigureComputed>): void {
      const bridge: StartupBridgeService = inject(StartupBridgeService);
      const startupStore: ReadableStartupStore = inject(StartupStore);
      initializeSelection(signalStore, startupStore.databasePath());
      const verifyJavaSettingMethod: RxMethod<{ path: string | null, signature: string | null }> = verifyJavaSetting(signalStore, bridge);
      const loadConfigureStateMethod: RxMethod<void> = loadConfigureState(signalStore, bridge, verifyJavaSettingMethod);
      loadConfigureStateMethod(undefined);
      const trackDownloadProgressMethod: RxMethod<void> = trackDownloadProgress(signalStore, bridge);
      trackDownloadProgressMethod(undefined);
    }
  })
);
