import {Inject, Injectable} from "@angular/core";
import {defer, from, Observable} from "rxjs";
import {AiDownloadOutcome, AiDownloadProgress, AiRemoveOutcome, ElectronAiState, TraQuityAiBridge} from "./ai-bridge.type";
import {BRIDGE_HOST, BridgeHost} from "./bridge-host.token";

/**
 * Wraps the `ai:*` channels of the `window.traquityAi` `contextBridge` surface `preload.js` exposes. An `available` flag plus one
 * wrapper per channel, each deferring the bridge call until subscription.
 */
@Injectable({providedIn: "root"})
export class AiBridgeService {

  private readonly bridge: TraQuityAiBridge | null;

  constructor(@Inject(BRIDGE_HOST) bridgeHost: BridgeHost) {
    this.bridge = bridgeHost.traquityAi ?? null;
  }

  get available(): boolean {
    return this.bridge != null;
  }

  getState(): Observable<ElectronAiState> {
    return defer((): Observable<ElectronAiState> => from(this.requireBridge().getAiState()));
  }

  confirmNotice(): Observable<void> {
    return defer((): Observable<void> => from(this.requireBridge().confirmAiNotice()));
  }

  downloadModel(key: string): Observable<AiDownloadOutcome> {
    return defer((): Observable<AiDownloadOutcome> => from(this.requireBridge().downloadModel(key)));
  }

  removeModel(key: string): Observable<AiRemoveOutcome> {
    return defer((): Observable<AiRemoveOutcome> => from(this.requireBridge().removeModel(key)));
  }

  /**
   * A fresh subscription registers its own listener on the bridge and unregisters it on unsubscribe - two concurrent
   * subscribers do not share one registration.
   */
  readonly downloadProgress$: Observable<AiDownloadProgress> = new Observable<AiDownloadProgress>((subscriber) => {
    return this.requireBridge().onAiDownloadProgress((progress: AiDownloadProgress): void => subscriber.next(progress));
  });

  private requireBridge(): TraQuityAiBridge {
    if (this.bridge == null) {
      throw new Error("The traquity bridge is not available");
    }
    return this.bridge;
  }
}
