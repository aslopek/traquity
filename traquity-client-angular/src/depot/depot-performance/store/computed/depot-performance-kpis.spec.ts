import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {RebasedDepotValue} from './rebased-depot-value.type';
import {DepotPerformanceKpis, depotPerformanceKpis} from './depot-performance-kpis';
import {dateRangeGrowth} from './date-range-growth';

jest.mock('./date-range-growth', (): unknown => ({dateRangeGrowth: jest.fn()}));

type DateRangeGrowthFunction = typeof dateRangeGrowth;

describe('depotPerformanceKpis', (): void => {
  let dateRangeGrowthMock: jest.Mock<DateRangeGrowthFunction>;
  let depotValues: WritableSignal<RebasedDepotValue[]>;
  let isRebased: WritableSignal<boolean>;
  let last: RebasedDepotValue;

  beforeEach((): void => {
    dateRangeGrowthMock = dateRangeGrowth as unknown as jest.Mock<DateRangeGrowthFunction>;
    dateRangeGrowthMock.mockReset();
    dateRangeGrowthMock.mockReturnValue({growthAbsolute: 15, growthRelative: 0.15});
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

  it('takes the growth from the date range growth at the last absolute value', (): void => {
    const expectedDepotValues: RebasedDepotValue[] = depotValues();

    expect(result()()).toEqual({
      investedCapital: 100,
      cashPosition: 25,
      cashPositionRelativeToAbsoluteValue: 0.2,
      absoluteValue: 125,
      dateRange: {growthAbsolute: 15, growthRelative: 0.15}
    });
    expect(dateRangeGrowthMock.mock.calls).toEqual([[expectedDepotValues, false, 125]]);
  });

  it('hands rebased depot values over as rebased', (): void => {
    const first: RebasedDepotValue = {...last, date: '2025-12-31', investedCapital: 60};
    const expectedDepotValues: RebasedDepotValue[] = [first, last];
    depotValues.set(expectedDepotValues);
    isRebased.set(true);

    expect(result()()).toEqual({
      investedCapital: 40,
      cashPosition: 25,
      cashPositionRelativeToAbsoluteValue: 0.2,
      absoluteValue: 125,
      dateRange: {growthAbsolute: 15, growthRelative: 0.15}
    });
    expect(dateRangeGrowthMock.mock.calls).toEqual([[expectedDepotValues, true, 125]]);
  });

  it('is empty without depot values', (): void => {
    depotValues.set([]);

    expect(result()()).toEqual({
      investedCapital: 0,
      cashPosition: 0,
      cashPositionRelativeToAbsoluteValue: 0,
      absoluteValue: 0,
      dateRange: {growthAbsolute: 0, growthRelative: 0}
    });
    expect(dateRangeGrowthMock).not.toHaveBeenCalled();
  });

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
