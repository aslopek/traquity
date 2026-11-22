import {computed, Signal} from '@angular/core';
import {BenchmarkResult} from '../benchmark/benchmark.type';
import {RebasedDepotValue} from './rebased-depot-value.type';
import {DateRangeGrowth, dateRangeGrowth} from './date-range-growth';
import {relativeTo} from './depot-values';
import {RelativePerformance} from '../../../../common/types/relative-performance';

export type BenchmarkOutcome = DateRangeGrowth & {
  /** the line's name */
  name: string
  /** the last shown day */
  valuedOn: string
  /** the depot value minus the line's value, both on the last shown day */
  depotLeadAbsolute: number
  /** `depotLeadAbsolute` relative to the line's value on the last shown day */
  depotLeadRelative: RelativePerformance
};

/**
 * Sums up how each benchmark line ended against the depot: the depot's lead on the last shown day, and the growth the depot would show,
 * were it worth the line's value of that day.
 *
 * @param benchmarkResultSignal the drawn lines, one value per shown day each
 * @param depotValuesSignal the shown days, ascending by date
 * @param isRebasedSignal whether the shown days are rebased against the first shown day's value
 * @returns one outcome per line, in the lines' order; none while no line is drawn
 */
export function benchmarkOutcomes(benchmarkResultSignal: Signal<BenchmarkResult | [BenchmarkResult, BenchmarkResult] | null>,
                                  depotValuesSignal: Signal<RebasedDepotValue[]>,
                                  isRebasedSignal: Signal<boolean>): Signal<BenchmarkOutcome[]> {
  return computed<BenchmarkOutcome[]>((): BenchmarkOutcome[] => {
    const result: BenchmarkResult | [BenchmarkResult, BenchmarkResult] | null = benchmarkResultSignal();
    const depotValues: RebasedDepotValue[] = depotValuesSignal();
    if (result == null || depotValues.length === 0) {
      return [];
    }

    const isRebased: boolean = isRebasedSignal();
    const last: RebasedDepotValue = depotValues[depotValues.length - 1];
    const lines: BenchmarkResult[] = Array.isArray(result) ? result : [result];
    return lines.map((line: BenchmarkResult): BenchmarkOutcome => {
      const lineValue: number = line.values[line.values.length - 1];
      const depotLeadAbsolute: number = last.absoluteValue - lineValue;
      return {
        name: line.name,
        valuedOn: last.date,
        depotLeadAbsolute,
        depotLeadRelative: relativeTo(depotLeadAbsolute, lineValue),
        ...dateRangeGrowth(depotValues, isRebased, lineValue)
      };
    });
  });
}
