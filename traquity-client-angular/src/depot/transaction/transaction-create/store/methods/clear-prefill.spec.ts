import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {patchState} from "@ngrx/signals";
import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {TransactionImportComputed, TransactionImportState} from "../transaction-import.store";
import {clearPrefill} from "./clear-prefill";

jest.mock("@ngrx/signals", (): unknown => ({patchState: jest.fn()}));

type PatchState = (store: unknown, update: Partial<TransactionImportState>) => void;
type ImportStore = WritableSignalStore<TransactionImportState, TransactionImportComputed>;

describe("clearPrefill", (): void => {

  let patchStateMock: jest.Mock<PatchState>;
  let store: ImportStore;

  beforeEach((): void => {
    patchStateMock = patchState as unknown as jest.Mock<PatchState>;
    patchStateMock.mockReset();
    store = {} as ImportStore;
  });

  it("drops the offered values", (): void => {
    clearPrefill(store);

    expect(patchStateMock).toHaveBeenCalledWith(store, {prefill: null});
    expect(patchStateMock).toHaveBeenCalledTimes(1);
  });
});
