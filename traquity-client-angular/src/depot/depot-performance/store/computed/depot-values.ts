import {ReadableSignalStore} from "../../../../common/types/signal-store.type";
import {DepotPerformanceState} from "../depot-performance.store";
import {Store} from "@ngrx/store";
import {AppState} from "../../../../store/app.state";
import {computed, Signal} from "@angular/core";
import {DepotPerformance, DepotValue} from "../../../../gen/api/depot-performance";
import {DataRange, fromDateRange} from "../../../../common/types/data-range";
import {depotPerformance as depotPerformanceSelector} from "../../../../store/depot/depot.selector";
import {format} from "date-fns";
import {RebasedDepotValue} from "./rebased-depot-value.type";

export type DepotValuesResult = {
  values: RebasedDepotValue[]
  /** whether values is rebased against the data range's own start value, rather than reflecting the depot's whole lifespan as-is */
  isRebased: boolean
};

function relativeTo(numerator: number, baseline: number): number | 'infinity' {
  if (baseline !== 0) {
    return numerator / baseline;
  }
  return numerator === 0 ? 0 : 'infinity';
}

function cashAdjustedAbsoluteValue(item: DepotValue, addCashToAbsoluteValue: boolean): number {
  return addCashToAbsoluteValue ? item.absoluteValue + item.cashPosition : item.absoluteValue;
}

export function depotValues(signalStore: ReadableSignalStore<DepotPerformanceState>, globalStore: Store<AppState>): Signal<DepotValuesResult> {
  const dateRange: Signal<DataRange> = signalStore.dataRange;
  const depotPerformance: Signal<DepotPerformance | null> = globalStore.selectSignal(depotPerformanceSelector);
  const addCashToAbsoluteValue: Signal<boolean> = signalStore.addCashToAbsoluteValue;

  return computed<DepotValuesResult>((): DepotValuesResult => {
    const allValues: DepotValue[] = depotPerformance()?.values ?? [];
    if (allValues.length === 0) {
      return {values: [], isRebased: false};
    }

    const minimumDate: string = format(fromDateRange(dateRange()), 'yyyy-MM-dd');
    const filtered: DepotValue[] = allValues.filter(item => item.date >= minimumDate);
    if (filtered.length <= 1 || filtered.length === allValues.length) {
      const values: RebasedDepotValue[] = filtered.map((item: DepotValue): RebasedDepotValue => {
        const absoluteValue: number = cashAdjustedAbsoluteValue(item, addCashToAbsoluteValue());
        const performanceAbsolute: number = absoluteValue - item.investedCapital;
        return {
          ...item,
          absoluteValue,
          performanceAbsolute,
          performanceRelative: relativeTo(performanceAbsolute, item.investedCapital)
        };
      });
      return {values, isRebased: false};
    }

    const baselineAbsoluteValue: number = cashAdjustedAbsoluteValue(filtered[0], addCashToAbsoluteValue());

    const values: RebasedDepotValue[] = filtered.map((item: DepotValue, index: number): RebasedDepotValue => {
      if (index === 0) {
        return {
          ...item,
          absoluteValue: baselineAbsoluteValue,
          performanceAbsolute: 0,
          performanceRelative: 0
        };
      }

      const absoluteValue: number = cashAdjustedAbsoluteValue(item, addCashToAbsoluteValue());
      const performanceAbsolute: number = absoluteValue - baselineAbsoluteValue;

      return {
        date: item.date,
        investedCapital: item.investedCapital,
        cashPosition: item.cashPosition,
        absoluteValue,
        performanceAbsolute,
        performanceRelative: relativeTo(performanceAbsolute, baselineAbsoluteValue)
      };
    });
    return {values, isRebased: true};
  });
}
