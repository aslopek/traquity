import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {PositionPerformance} from '../../../../gen/api/depot-performance';
import {PerformanceBreakdownState} from '../performance-breakdown.store';
import {RelativePerformance} from '../../../../common/types/relative-performance';

export type RelativePerformanceSlice = Pick<PerformanceBreakdownState, 'performance'>;

export function relativePerformance(signalStore: ReadableSignalStore<RelativePerformanceSlice>): Signal<RelativePerformance | null> {
  return computed((): RelativePerformance | null => {
    const performance: PositionPerformance | null = signalStore.performance();
    if (performance === null) {
      return null;
    }
    return performance.performanceRelative ?? (performance.costBasis < 0 ? 'none' : 'infinity');
  });
}
