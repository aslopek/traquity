import {AuthState} from "../../../../bridge/startup-bridge.type";
import {StartupPhase} from "../startup.store";

/**
 * The single source of truth for "which URL belongs to which phase", so the mapping is never encoded a second time.
 * `booting` has no URL of its own and yields `null`: it is the shell at `/`.
 */
export function startupRouteFor(phase: StartupPhase): string | null {
  switch (phase) {
    case "unlock":
      return "/unlock";
    case "configure":
      return "/configure";
    case "insecure":
      return "/insecure";
    default:
      return null;
  }
}

/**
 * A pending database (no record yet) goes back to the unlock screen, while a verified `scrypt` entry or a `passwordless` database goes to
 * the configuration screen.
 */
export function phaseAfterFailedStart(startedFrom: AuthState): StartupPhase {
  return startedFrom === "pending" ? "unlock" : "configure";
}
