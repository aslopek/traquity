import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {DepotPerformanceComputed, DepotPerformanceState} from '../depot-performance.store';
import {patchState} from '@ngrx/signals';

export function setShowInvestedCapital(signalStore: WritableSignalStore<DepotPerformanceState, DepotPerformanceComputed>, showInvestedCapital: boolean): void {
  patchState(signalStore, {showInvestedCapital});
}
