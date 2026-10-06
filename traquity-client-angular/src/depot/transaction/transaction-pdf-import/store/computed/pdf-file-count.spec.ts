import {describe, expect, it} from "@jest/globals";
import {signalState, SignalState} from "@ngrx/signals";
import {pickedPdfFileFactory} from "../../../../../testing/picked-pdf-file.factory";
import {initialState, PickedPdfFile, TransactionPdfImportState} from "../transaction-pdf-import.type";
import {pdfFileCount} from "./pdf-file-count";

describe("pdfFileCount", (): void => {
  it("counts the picked PDF files", (): void => {
    const files: PickedPdfFile[] = [pickedPdfFileFactory()];
    const store: SignalState<TransactionPdfImportState> = signalState<TransactionPdfImportState>({
      ...initialState,
      files
    });

    expect(pdfFileCount(store)()).toBe(1);
  });

  it("is zero for no picked files", (): void => {
    const store: SignalState<TransactionPdfImportState> = signalState<TransactionPdfImportState>({...initialState});

    expect(pdfFileCount(store)()).toBe(0);
  });
});
