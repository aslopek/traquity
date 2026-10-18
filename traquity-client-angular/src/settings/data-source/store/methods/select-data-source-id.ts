import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {DataSourceState} from '../data-source.store';
import {patchState} from '@ngrx/signals';

export function selectDataSourceId(signalStore: WritableSignalStore<DataSourceState>, id: number | null): void {
  const currentId: number | null = signalStore.selectedDataSourceId();
  if (id === currentId) {
    return;
  }

  if (id === null) {
    patchState(signalStore, {selectedDataSourceId: null});
    return;
  }

  const dataSourceExists: boolean = signalStore.dataSources().some(ds => ds.id === id);
  if (dataSourceExists) {
    patchState(signalStore, {selectedDataSourceId: id});
  }
}
