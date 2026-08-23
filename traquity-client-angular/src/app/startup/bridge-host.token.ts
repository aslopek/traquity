import {InjectionToken} from "@angular/core";
import {TraQuityAiBridge} from "./ai-bridge.type";
import {TraQuityStartupBridge} from "./startup-bridge.type";

export type BridgeHost = { traquity?: TraQuityStartupBridge, traquityAi?: TraQuityAiBridge };

// read through `globalThis`, not `window` directly - the Angular suite runs with `testEnvironment: 'node'`, where a
// bare `window` reference throws
export const BRIDGE_HOST: InjectionToken<BridgeHost> = new InjectionToken<BridgeHost>('BRIDGE_HOST', {
  providedIn: 'root',
  factory: (): BridgeHost => globalThis as BridgeHost
});
