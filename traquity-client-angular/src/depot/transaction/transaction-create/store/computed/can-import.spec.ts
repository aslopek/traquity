import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {signal, Signal, WritableSignal} from "@angular/core";
import {Store} from "@ngrx/store";
import {AppState} from "../../../../../store/app.state";
import {canImport} from "./can-import";

type MockedStore = Pick<Store<AppState>, "selectSignal">;

describe("canImport", (): void => {
  let busy: WritableSignal<boolean>;
  let aiActive: WritableSignal<boolean>;
  let selectSignal: jest.Mock<(selector: unknown) => unknown>;
  let globalStore: Store<AppState>;

  beforeEach((): void => {
    busy = signal<boolean>(false);
    aiActive = signal<boolean>(true);

    selectSignal = jest.fn((): unknown => aiActive);
    globalStore = {selectSignal: selectSignal as MockedStore["selectSignal"]} satisfies MockedStore as Store<AppState>;
  });

  it("allows an import while AI is active and nothing is running", (): void => {
    const result: Signal<boolean> = canImport({busy}, globalStore);

    expect(result()).toBe(true);
  });

  it("refuses an import while one is already running", (): void => {
    busy.set(true);

    const result: Signal<boolean> = canImport({busy}, globalStore);

    expect(result()).toBe(false);
  });

  it("refuses an import while AI is inactive", (): void => {
    aiActive.set(false);

    const result: Signal<boolean> = canImport({busy}, globalStore);

    expect(result()).toBe(false);
  });
});
