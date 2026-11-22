import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {rebasedDepotValueFactory} from '../../../../testing/rebased-depot-value.factory';
import {BenchmarkResult} from '../benchmark/benchmark.type';
import {RebasedDepotValue} from './rebased-depot-value.type';
import {relativeTo} from './depot-values';
import {dateRangeGrowth} from './date-range-growth';
import {BenchmarkOutcome, benchmarkOutcomes} from './benchmark-outcomes';

jest.mock('./depot-values', (): unknown => ({relativeTo: jest.fn()}));
jest.mock('./date-range-growth', (): unknown => ({dateRangeGrowth: jest.fn()}));

type RelativeToFunction = typeof relativeTo;
type DateRangeGrowthFunction = typeof dateRangeGrowth;

describe('benchmarkOutcomes', (): void => {
  let relativeToMock: jest.Mock<RelativeToFunction>;
  let dateRangeGrowthMock: jest.Mock<DateRangeGrowthFunction>;
  let benchmarkResult: WritableSignal<BenchmarkResult | [BenchmarkResult, BenchmarkResult] | null>;
  let depotValues: WritableSignal<RebasedDepotValue[]>;
  let isRebased: WritableSignal<boolean>;
  let result: Signal<BenchmarkOutcome[]>;

  beforeEach((): void => {
    relativeToMock = relativeTo as unknown as jest.Mock<RelativeToFunction>;
    relativeToMock.mockReset();
    relativeToMock.mockReturnValue(0.25);
    dateRangeGrowthMock = dateRangeGrowth as unknown as jest.Mock<DateRangeGrowthFunction>;
    dateRangeGrowthMock.mockReset();
    dateRangeGrowthMock.mockReturnValue({growthAbsolute: 20, growthRelative: 0.2});

    benchmarkResult = signal<BenchmarkResult | [BenchmarkResult, BenchmarkResult] | null>({
      name: 'Line',
      values: [100, 120]
    });

    depotValues = signal<RebasedDepotValue[]>([
      rebasedDepotValueFactory({date: '2026-11-19', absoluteValue: 110}),
      rebasedDepotValueFactory({date: '2026-11-20', absoluteValue: 150})
    ]);
    isRebased = signal<boolean>(false);
    result = benchmarkOutcomes(benchmarkResult, depotValues, isRebased);
  });

  it('measures the depot\'s last value against the line\'s last value', (): void => {
    const expectedDepotValues: RebasedDepotValue[] = depotValues();

    expect(result()).toEqual([{
      name: 'Line',
      valuedOn: '2026-11-20',
      depotLeadAbsolute: 30,
      depotLeadRelative: 0.25,
      growthAbsolute: 20,
      growthRelative: 0.2
    }]);
    expect(relativeToMock.mock.calls).toEqual([[30, 120]]);
    expect(dateRangeGrowthMock.mock.calls).toEqual([[expectedDepotValues, false, 120]]);
  });

  it('is empty without a drawn line', (): void => {
    benchmarkResult.set(null);

    expect(result()).toEqual([]);
    expect(relativeToMock).not.toHaveBeenCalled();
    expect(dateRangeGrowthMock).not.toHaveBeenCalled();
  });

  it('is empty without depot values', (): void => {
    depotValues.set([]);

    expect(result()).toEqual([]);
    expect(relativeToMock).not.toHaveBeenCalled();
    expect(dateRangeGrowthMock).not.toHaveBeenCalled();
  });

  it('shows one outcome per line, in the lines\' order', (): void => {
    const expectedDepotValues: RebasedDepotValue[] = depotValues();
    benchmarkResult.set([
      {
        name: 'Lucky',
        values: [100, 200]
      },
      {
        name: 'Unlucky',
        values: [100, 100]
      }
    ]);
    relativeToMock.mockReturnValueOnce(-0.25).mockReturnValueOnce(0.5);
    dateRangeGrowthMock
      .mockReturnValueOnce({growthAbsolute: 100, growthRelative: 1})
      .mockReturnValueOnce({growthAbsolute: 0, growthRelative: 0});

    expect(result()).toEqual([
      {
        name: 'Lucky',
        valuedOn: '2026-11-20',
        depotLeadAbsolute: -50,
        depotLeadRelative: -0.25,
        growthAbsolute: 100,
        growthRelative: 1
      },
      {
        name: 'Unlucky',
        valuedOn: '2026-11-20',
        depotLeadAbsolute: 50,
        depotLeadRelative: 0.5,
        growthAbsolute: 0,
        growthRelative: 0
      }
    ]);
    expect(relativeToMock.mock.calls).toEqual([
      [-50, 200],
      [50, 100]
    ]);
    expect(dateRangeGrowthMock.mock.calls).toEqual([
      [expectedDepotValues, false, 200],
      [expectedDepotValues, false, 100]
    ]);
  });

  it('relates the depot\'s lead to a line ending at 0', (): void => {
    benchmarkResult.set({
      name: 'Line',
      values: [100, 0]
    });

    result();

    expect(relativeToMock.mock.calls).toEqual([[150, 0]]);
  });

  it('hands over rebased depot values as rebased', (): void => {
    const expectedDepotValues: RebasedDepotValue[] = depotValues();
    isRebased.set(true);

    result();

    expect(dateRangeGrowthMock.mock.calls).toEqual([[expectedDepotValues, true, 120]]);
  });

  it('follows new depot values and a new line', (): void => {
    result();
    relativeToMock.mockClear();
    dateRangeGrowthMock.mockClear();
    const newDepotValues: RebasedDepotValue[] = [
      rebasedDepotValueFactory({date: '2026-11-20', absoluteValue: 150}),
      rebasedDepotValueFactory({date: '2026-11-21', absoluteValue: 160})
    ];
    depotValues.set(newDepotValues);
    benchmarkResult.set({
      name: 'Line',
      values: [100, 140
      ]});

    expect(result()).toEqual([{
      name: 'Line',
      valuedOn: '2026-11-21',
      depotLeadAbsolute: 20,
      depotLeadRelative: 0.25,
      growthAbsolute: 20,
      growthRelative: 0.2
    }]);
    expect(relativeToMock.mock.calls).toEqual([[20, 140]]);
    expect(dateRangeGrowthMock.mock.calls).toEqual([[newDepotValues, false, 140]]);
  });
});
