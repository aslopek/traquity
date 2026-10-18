import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {DataSourceState} from '../data-source.store';
import {DataSourceWithId} from '../../data-source.type';
import {patchState} from '@ngrx/signals';

export function setDataSources(signalStore: WritableSignalStore<DataSourceState>, dataSources: DataSourceWithId[]): void {
  const selectedDataSourceId: number | null = signalStore.selectedDataSourceId();
  if (selectedDataSourceId === null) {
    patchState(signalStore, {dataSources});
  }

  for (const dataSource of signalStore.dataSources()) {
    if (dataSource.id === selectedDataSourceId) {
      patchState(signalStore, {dataSources});
      return;
    }
  }
  patchState(signalStore, {
    dataSources,
    selectedDataSourceId: null
  });
}
