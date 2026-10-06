import {patchState} from "@ngrx/signals";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {PickedFolder} from "../folder/picked-folder-of-files";
import {TransactionPdfImportState} from "../transaction-pdf-import.type";

export function setFolder(signalStore: WritableSignalStore<TransactionPdfImportState>, folder: PickedFolder): void {
  patchState(signalStore, {
    folder: folder.path,
    files: folder.files,
    collected: [],
    faulty: [],
    filesDone: 0,
    currentPath: null
  });
}
