import {patchState} from '@ngrx/signals';
import {WritableSignalStore} from '../../../../common/types/signal-store.type';
import {DepotPerformanceState} from '../depot-performance.store';
import {Benchmark} from '../benchmark/benchmark.type';

export function setBenchmark(signalStore: WritableSignalStore<DepotPerformanceState>, benchmark: Benchmark | null): void {
  patchState(signalStore, {benchmark});
}
