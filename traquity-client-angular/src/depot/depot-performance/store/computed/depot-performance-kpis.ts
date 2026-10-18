import {computed, Signal} from '@angular/core';
import {RebasedDepotValue} from './rebased-depot-value.type';
import {relativeTo} from './depot-values';

export type DepotPerformanceKpis = {
  investedCapital: number
  cashPosition: number
  cashPositionRelativeToAbsoluteValue: number | 'infinity'
  absoluteValue: number
  dateRange: {
    growthAbsolute: number
    growthRelative: number | 'infinity'
  }
};

const emptyKpis: DepotPerformanceKpis = {
  investedCapital: 0,
  cashPosition: 0,
  cashPositionRelativeToAbsoluteValue: 0,
  absoluteValue: 0,
  dateRange: {
    growthAbsolute: 0,
    growthRelative: 0
  }
} as const;

export function depotPerformanceKpis(depotValuesSignal: Signal<RebasedDepotValue[]>,
                                     isRebasedSignal: Signal<boolean>): Signal<DepotPerformanceKpis> {
  return computed<DepotPerformanceKpis>((): DepotPerformanceKpis => {
    const depotValues: RebasedDepotValue[] = depotValuesSignal();
    if (depotValues.length === 0) {
      return emptyKpis;
    }

    const first: RebasedDepotValue = depotValues[0];
    const last: RebasedDepotValue = depotValues[depotValues.length - 1];
    const isRebased: boolean = isRebasedSignal();
    // with a single data point in view there's no 'during the window' to measure growth over
    const isSingleDataPoint: boolean = depotValues.length === 1;

    return {
      investedCapital: isRebased ? last.investedCapital - first.investedCapital : last.investedCapital,
      cashPosition: last.cashPosition,
      cashPositionRelativeToAbsoluteValue: relativeTo(last.cashPosition, last.absoluteValue),
      absoluteValue: last.absoluteValue,
      dateRange: {
        growthAbsolute: isSingleDataPoint ? 0 : last.performanceAbsolute,
        growthRelative: isSingleDataPoint ? 0 : last.performanceRelative
      }
    };
  });
}
