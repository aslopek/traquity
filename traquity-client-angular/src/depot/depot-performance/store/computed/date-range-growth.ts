import {RebasedDepotValue} from './rebased-depot-value.type';
import {relativeTo} from './depot-values';
import {RelativePerformance} from '../../../../common/types/relative-performance';

export type DateRangeGrowth = {
  growthAbsolute: number
  growthRelative: RelativePerformance
};

/**
 * Measures how much the depot grew over the shown days, were it worth `lastValue` on the last shown day. Rebased depot values grow from
 * the first shown day's value, all others from the last shown day's invested capital. A single shown day has no growth.
 *
 * @param depotValues the shown days, ascending by date; at least one
 * @param isRebased whether `depotValues` is rebased against the first shown day's value
 * @param lastValue the depot's value on the last shown day
 * @returns the growth in the depot currency and relative to the value it grows from
 */
export function dateRangeGrowth(depotValues: RebasedDepotValue[], isRebased: boolean, lastValue: number): DateRangeGrowth {
  if (depotValues.length === 1) {
    return {growthAbsolute: 0, growthRelative: 0};
  }
  const last: RebasedDepotValue = depotValues[depotValues.length - 1];
  const base: number = isRebased ? depotValues[0].absoluteValue : last.investedCapital;
  const growthAbsolute: number = lastValue - base;
  return {growthAbsolute, growthRelative: relativeTo(growthAbsolute, base)};
}
