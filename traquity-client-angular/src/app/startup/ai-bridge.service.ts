import {Inject, Injectable} from "@angular/core";
import {defer, from, Observable} from "rxjs";
import {BRIDGE_HOST, BridgeHost} from "./bridge-host.token";
import {ElectronAiState, TraQuityBridge} from "./startup-bridge.type";

/**
 * Wraps the `ai:*` channels of the `contextBridge` surface `preload.js` exposes. An `available` flag plus one wrapper per channel, each
 * deferring the bridge call until subscription.
 */
@Injectable({providedIn: "root"})
export class AiBridgeService {

  private readonly bridge: TraQuityBridge | null;

  constructor(@Inject(BRIDGE_HOST) bridgeHost: BridgeHost) {
    this.bridge = bridgeHost.traquity ?? null;
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

  private requireBridge(): TraQuityBridge {
    if (this.bridge == null) {
      throw new Error("The traquity bridge is not available");
    }
    return this.bridge;
  }
}
