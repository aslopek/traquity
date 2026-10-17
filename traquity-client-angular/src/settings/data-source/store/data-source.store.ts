import {DataSourceWithId} from "../data-source.type";
import {ReadableSignalStore, WritableSignalStore} from "../../../common/types/signal-store.type";
import {signalStore, withComputed, withMethods, withState} from "@ngrx/signals";
import {selectDataSourceId} from "./methods/select-data-source-id";
import {setDataSources} from "./methods/set-data-sources";
import {Signal} from "@angular/core";
import {selectedDatasource} from "./computed/selected-datasource";
import {selectedDataSourceIsPreconfigured} from "./computed/selected-data-source-is-preconfigured";

export type DataSourceComputed = {
  selectedDataSource: Signal<DataSourceWithId | null>
  selectedDataSourceIsPreconfigured: Signal<boolean>
};

export type DataSourceMethods = {
  selectDataSourceId: (id: number | null) => void
  setDataSources: (dataSources: DataSourceWithId[]) => void
};

export type DataSourceState = {
  dataSources: DataSourceWithId[];
  selectedDataSourceId: number | null;
  minimumIdForDeletion: number
};

const initialState: DataSourceState = {
  dataSources: [],
  selectedDataSourceId: null,
  minimumIdForDeletion: 101
} as const;

export type ReadableDataSourceStore = ReadableSignalStore<DataSourceState, DataSourceComputed, DataSourceMethods>;

export const DataSourceStore = signalStore(
  withState(initialState),
  withComputed((signalStore: ReadableSignalStore<DataSourceState>): DataSourceComputed => {
    return {
      selectedDataSource: selectedDatasource(signalStore),
      selectedDataSourceIsPreconfigured: selectedDataSourceIsPreconfigured(signalStore)
    };
  }),
  withMethods((signalStore: WritableSignalStore<DataSourceState, DataSourceComputed>): DataSourceMethods => {
    return {
      selectDataSourceId: (id: number | null): void => selectDataSourceId(signalStore, id),
      setDataSources: (dataSources: DataSourceWithId[]): void => setDataSources(signalStore, dataSources)
    };
  })
);
