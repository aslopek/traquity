import {computed, Signal} from '@angular/core';
import {DataSourceWithId} from '../../data-source.type';
import {DataSourceState} from '../data-source.store';
import {ReadableSignalStore} from '../../../../common/types/signal-store.type';

export function selectedDatasource(signalStore: ReadableSignalStore<DataSourceState>): Signal<DataSourceWithId | null> {
  const selectedDataSourceIdSignal: Signal<number | null> = signalStore.selectedDataSourceId;
  const dataSources: Signal<DataSourceWithId[]> = signalStore.dataSources;

  return computed<DataSourceWithId | null>((): DataSourceWithId | null => {
    const selectedDataSourceId: number | null = selectedDataSourceIdSignal();
    if (selectedDataSourceId === null) {
      return null;
    }
    for (const dataSource of dataSources()) {
      if (dataSource.id === selectedDataSourceId) {
        return dataSource;
      }
    }
    return null;
  });
}
