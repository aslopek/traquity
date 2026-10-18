import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {DepotPerformanceComputed, DepotPerformanceState} from '../depot-performance.store';
import {patchState} from '@ngrx/signals';

export function setAddCashToAbsoluteValue(signalStore: WritableSignalStore<DepotPerformanceState, DepotPerformanceComputed>, addCashToAbsoluteValue: boolean): void {
  patchState(signalStore, {addCashToAbsoluteValue});
}
