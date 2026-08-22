import {Inject, Injectable} from "@angular/core";
import {defer, from, Observable} from "rxjs";
import {BRIDGE_HOST, BridgeHost} from "./bridge-host.token";
import {
  AppliedConfiguration,
  BackendStartOutcome,
  ConfigurationChanges,
  ConfigureState,
  JavaDownloadOutcome,
  JavaDownloadProgress,
  JavaPickResult,
  JavaVerification,
  PickedDatabase,
  StartupState,
  TraQuityBridge
} from "./startup-bridge.type";

/**
 * Wraps the startup/configuration channels of the `contextBridge` surface exposed by `preload.js` as observables. A
 * further channel used by this same flow is added here as another wrapper, never by reaching into `window.traquity`
 * from somewhere else; a channel scoped to an unrelated settings section gets its own bridge service instead
 * (`AiBridgeService` is the reference), shaped the same way.
 */
@Injectable({providedIn: "root"})
export class StartupBridgeService {

  private readonly bridge: TraQuityBridge | null;

  constructor(@Inject(BRIDGE_HOST) bridgeHost: BridgeHost) {
    this.bridge = bridgeHost.traquity ?? null;
  }

  get available(): boolean {
    return this.bridge != null;
  }

  getStartupState(): Observable<StartupState> {
    return defer((): Observable<StartupState> => from(this.requireBridge().getStartupState()));
  }

  startBackend(password: string): Observable<BackendStartOutcome> {
    return defer((): Observable<BackendStartOutcome> => from(this.requireBridge().startBackend(password)));
  }

  verifyPassword(password: string): Observable<boolean> {
    return defer((): Observable<boolean> => from(this.requireBridge().verifyPassword(password)));
  }

  getConfigureState(): Observable<ConfigureState> {
    return defer((): Observable<ConfigureState> => from(this.requireBridge().getConfigureState()));
  }

  pickExistingDatabase(currentSelection: string | null): Observable<string | null> {
    return defer((): Observable<string | null> => from(this.requireBridge().pickExistingDatabase(currentSelection)));
  }

  pickNewDatabase(currentSelection: string | null): Observable<PickedDatabase | null> {
    return defer((): Observable<PickedDatabase | null> => from(this.requireBridge().pickNewDatabase(currentSelection)));
  }

  forgetPassword(databasePath: string): Observable<void> {
    return defer((): Observable<void> => from(this.requireBridge().forgetPassword(databasePath)));
  }

  applyConfiguration(changes: ConfigurationChanges): Observable<AppliedConfiguration> {
    return defer((): Observable<AppliedConfiguration> => from(this.requireBridge().applyConfiguration(changes)));
  }

  verifyJava(setting: string | null): Observable<JavaVerification> {
    return defer((): Observable<JavaVerification> => from(this.requireBridge().verifyJava(setting)));
  }

  pickJava(currentSetting: string | null): Observable<JavaPickResult | null> {
    return defer((): Observable<JavaPickResult | null> => from(this.requireBridge().pickJava(currentSetting)));
  }

  downloadJava(): Observable<JavaDownloadOutcome> {
    return defer((): Observable<JavaDownloadOutcome> => from(this.requireBridge().downloadJava()));
  }

  /**
   * A fresh subscription registers its own listener on the bridge and unregisters it on unsubscribe - two concurrent
   * subscribers do not share one registration.
   */
  readonly javaDownloadProgress$: Observable<JavaDownloadProgress> = new Observable<JavaDownloadProgress>((subscriber) => {
    return this.requireBridge().onJavaDownloadProgress((progress: JavaDownloadProgress): void => subscriber.next(progress));
  });

  /**
   * Fire-and-forget: nothing here may depend on the app still running afterward.
   */
  restartAndConfigure(): void {
    this.requireBridge().restartAndConfigure();
  }

  /**
   * Fire-and-forget: `ipcRenderer.send` returns synchronously and `app.quit()` is vetoable in Electron, so nothing
   * here may depend on the app still running afterward.
   */
  quit(): void {
    this.requireBridge().quit();
  }

  private requireBridge(): TraQuityBridge {
    if (this.bridge == null) {
      throw new Error("The traquity bridge is not available");
    }
    return this.bridge;
  }
}
