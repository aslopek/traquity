import {describe, expect, it} from "@jest/globals";
import {signalState, SignalState} from "@ngrx/signals";
import {pickedPdfFileFactory} from "../../../../../testing/picked-pdf-file.factory";
import {initialState, PickedPdfFile, TransactionPdfImportState} from "../transaction-pdf-import.type";
import {extractProgress} from "./extract-progress";

describe("extractProgress", (): void => {
  it("is zero with no picked files", (): void => {
    const store: SignalState<TransactionPdfImportState> = signalState<TransactionPdfImportState>({...initialState});

    expect(extractProgress(store)()).toBe(0);
  });

  it("is the finished share of the picked files", (): void => {
    const files: PickedPdfFile[] = [
      pickedPdfFileFactory({path: "/a.pdf"}),
      pickedPdfFileFactory({path: "/b.pdf"}),
      pickedPdfFileFactory({path: "/c.pdf"}),
      pickedPdfFileFactory({path: "/d.pdf"})
    ];
    const store: SignalState<TransactionPdfImportState> = signalState<TransactionPdfImportState>({
      ...initialState,
      files,
      filesDone: 1
    });

    expect(extractProgress(store)()).toBe(25);
  });
});
