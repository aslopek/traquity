import {beforeEach, describe, expect, it} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {
  selectedDataSourceIsPreconfigured,
  SelectedDataSourceIsPreconfiguredSlice
} from './selected-data-source-is-preconfigured';

describe('selectedDataSourceIsPreconfigured', (): void => {

  let selectedDataSourceId: WritableSignal<number | null>;
  let minimumIdForDeletion: WritableSignal<number>;

  beforeEach((): void => {
    selectedDataSourceId = signal<number | null>(3);
    minimumIdForDeletion = signal<number>(101);
  });

  function result(): Signal<boolean> {
    const slice: ReadableSignalStore<SelectedDataSourceIsPreconfiguredSlice> = {selectedDataSourceId, minimumIdForDeletion};
    return selectedDataSourceIsPreconfigured(slice);
  }

  it('is true for a selected id below the lowest deletable one', (): void => {
    expect(result()()).toBe(true);
  });

  it('is false for a selected id equal to the lowest deletable one', (): void => {
    selectedDataSourceId.set(minimumIdForDeletion());

    expect(result()()).toBe(false);
  });

  it('is false for a selected id above the lowest deletable one', (): void => {
    selectedDataSourceId.set(minimumIdForDeletion() + 1);

    expect(result()()).toBe(false);
  });

  it('is false while nothing is selected', (): void => {
    selectedDataSourceId.set(null);

    expect(result()()).toBe(false);
  });
});
