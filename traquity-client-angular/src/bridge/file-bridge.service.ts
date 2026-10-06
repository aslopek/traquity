import {Inject, Injectable} from "@angular/core";
import {BRIDGE_HOST, BridgeHost} from "./bridge-host.token";
import {TraQuityFileBridge} from "./file-bridge.type";

/**
 * Wraps the `window.traquityFiles` `contextBridge` surface: an `available` flag plus `pathForFile`.
 */
@Injectable({providedIn: "root"})
export class FileBridgeService {

  private readonly bridge: TraQuityFileBridge | null;

  constructor(@Inject(BRIDGE_HOST) bridgeHost: BridgeHost) {
    this.bridge = bridgeHost.traquityFiles ?? null;
  }

  get available(): boolean {
    return this.bridge != null;
  }

  pathForFile(file: File): string {
    return this.requireBridge().pathForFile(file);
  }

  private requireBridge(): TraQuityFileBridge {
    if (this.bridge == null) {
      throw new Error("The traquity bridge is not available");
    }
    return this.bridge;
  }
}
