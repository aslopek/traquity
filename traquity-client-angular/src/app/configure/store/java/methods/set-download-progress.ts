import {patchState} from "@ngrx/signals";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {JavaDownloadProgress} from "../../../../../bridge/startup-bridge.type";
import {ConfigureStoreState} from "../../configure.store";

/** Also clears a previous download's error: a new attempt starts clean. */
export function setDownloadProgress(signalStore: WritableSignalStore<ConfigureStoreState>, progress: JavaDownloadProgress): void {
  patchState(signalStore, {javaDownload: progress, javaDownloadError: null});
}
