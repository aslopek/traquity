import {computed, Signal} from "@angular/core";
import {DataSourceState} from "../data-source.store";
import {ReadableSignalStore} from "../../../../common/types/signal-store.type";

export type SelectedDataSourceIsPreconfiguredSlice = Pick<DataSourceState, 'selectedDataSourceId' | 'minimumIdForDeletion'>;

export function selectedDataSourceIsPreconfigured(
  signalStore: ReadableSignalStore<SelectedDataSourceIsPreconfiguredSlice>): Signal<boolean> {
  const selectedDataSourceIdSignal: Signal<number | null> = signalStore.selectedDataSourceId;
  const minimumIdForDeletion: Signal<number> = signalStore.minimumIdForDeletion;

  return computed<boolean>((): boolean => {
    const selectedDataSourceId: number | null = selectedDataSourceIdSignal();
    return selectedDataSourceId !== null && selectedDataSourceId < minimumIdForDeletion();
  });
}
