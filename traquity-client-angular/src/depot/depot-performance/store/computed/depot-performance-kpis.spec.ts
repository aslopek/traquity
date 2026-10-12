import {beforeEach, describe, expect, it} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {RebasedDepotValue} from './rebased-depot-value.type';
import {DepotPerformanceKpis, depotPerformanceKpis} from './depot-performance-kpis';

describe('depotPerformanceKpis', (): void => {
  let depotValues: WritableSignal<RebasedDepotValue[]>;
  let isRebased: WritableSignal<boolean>;
  let last: RebasedDepotValue;

  beforeEach((): void => {
    last = {
      date: '2026-01-01',
      investedCapital: 100,
      cashPosition: 25,
      absoluteValue: 125,
      performanceAbsolute: 25,
      performanceRelative: 0.25
    };
    depotValues = signal<RebasedDepotValue[]>([last]);
    isRebased = signal<boolean>(false);
  });

  function result(): Signal<DepotPerformanceKpis> {
    return depotPerformanceKpis(depotValues, isRebased);
  }

  it('relates the cash position to the absolute value shown beside it', (): void => {
    expect(result()().cashPositionRelativeToAbsoluteValue).toBe(0.2);
    expect(result()().absoluteValue).toBe(125);
  });

  it('reports a full share for a depot holding only cash', (): void => {
    depotValues.set([{...last, cashPosition: 1485.81, absoluteValue: 1485.81}]);

    expect(result()().cashPositionRelativeToAbsoluteValue).toBe(1);
  });

  it('reports an unbounded share for a depot whose displayed value is 0 but which holds cash', (): void => {
    depotValues.set([{...last, cashPosition: 1485.81, absoluteValue: 0}]);

    expect(result()().cashPositionRelativeToAbsoluteValue).toBe('infinity');
  });

  it('reports a zero share for an empty depot', (): void => {
    depotValues.set([{...last, cashPosition: 0, absoluteValue: 0}]);

    expect(result()().cashPositionRelativeToAbsoluteValue).toBe(0);
  });

  it('reports a zero share for a depot without cash', (): void => {
    depotValues.set([{...last, cashPosition: 0, absoluteValue: 50}]);

    expect(result()().cashPositionRelativeToAbsoluteValue).toBe(0);
  });
});
