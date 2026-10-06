import {beforeEach, describe, expect, it} from "@jest/globals";
import {signalState, SignalState} from "@ngrx/signals";
import {collectedTransactionFactory} from "../../../../../testing/collected-transaction.factory";
import {pickedPdfFileFactory} from "../../../../../testing/picked-pdf-file.factory";
import {initialState, TransactionPdfImportState} from "../transaction-pdf-import.type";
import {PickedFolder} from "../folder/picked-folder-of-files";
import {setFolder} from "./set-folder";

describe("setFolder", (): void => {
  let store: SignalState<TransactionPdfImportState>;
  let folder: PickedFolder;

  beforeEach((): void => {
    store = signalState<TransactionPdfImportState>({
      ...initialState,
      collected: [collectedTransactionFactory({path: "/old/a.pdf"})],
      faulty: [{path: "/old/b.pdf", reason: "could not be read"}],
      filesDone: 2,
      currentPath: "/old/b.pdf"
    });

    folder = {
      path: "C:\\broker",
      files: [pickedPdfFileFactory({path: "C:\\broker\\new.pdf"})]
    };
  });

  it("states the picked folder and its files, resetting the previous run", (): void => {
    setFolder(store, folder);

    expect(store.folder()).toBe(folder.path);
    expect(store.files()).toEqual(folder.files);
    expect(store.collected()).toEqual([]);
    expect(store.faulty()).toEqual([]);
    expect(store.filesDone()).toBe(0);
    expect(store.currentPath()).toBeNull();
  });
});
