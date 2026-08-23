import {patchState} from "@ngrx/signals";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {JavaVerification} from "../../../../../bridge/startup-bridge.type";
import {ConfigureStoreState} from "../../configure.store";

/**
 * Signature and verification move together. An `ok` result stores the path the caller says this
 * verification is *for* - `null` for the `PATH` candidate - together with its signature, and clears any in-progress
 * download and stale pick error: an adopted setting works, whether it came from a download, a pick or neither, so
 * nothing about a previous failure belongs on screen any more. An `error` result stores only the verification,
 * leaving the path and signature exactly as they were, so the selection falls out as `null` without discarding a
 * working setting nothing was found wrong with.
 */
export function setJavaSetting(signalStore: WritableSignalStore<ConfigureStoreState>,
                               path: string | null, verification: JavaVerification, signature: string | null): void {
  if (verification.status === 'error') {
    patchState(signalStore, {javaVerification: verification});
    return;
  }
  patchState(signalStore, {
    javaPath: path,
    javaSignature: signature,
    javaVerification: verification,
    javaDownload: null,
    javaPickError: null
  });
}
