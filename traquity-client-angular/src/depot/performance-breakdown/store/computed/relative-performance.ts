import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {PositionPerformance} from '../../../../gen/api/depot-performance';
import {PerformanceBreakdownState} from '../performance-breakdown.store';

export type RelativePerformanceSlice = Pick<PerformanceBreakdownState, 'performance'>;

export function relativePerformance(signalStore: ReadableSignalStore<RelativePerformanceSlice>): Signal<number | 'infinity' | null> {
  return computed((): number | 'infinity' | null => {
    const performance: PositionPerformance | null = signalStore.performance();
    return performance === null ? null : performance.performanceRelative ?? 'infinity';
  });
}
