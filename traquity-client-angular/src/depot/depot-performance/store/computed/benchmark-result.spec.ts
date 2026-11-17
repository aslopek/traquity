import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {Store} from '@ngrx/store';
import {HistoricalSecurityPrice} from '../../../../gen/api/historical-security-price';
import {SecurityNamePipe} from '../../../../common/pipe/security-name.pipe';
import {AppState} from '../../../../store/app.state';
import {rebasedDepotValueFactory} from '../../../../testing/rebased-depot-value.factory';
import {historicalSecurityPriceFactory} from '../../../../testing/historical-security-price.factory';
import {Benchmark, BenchmarkResult, FixedInterestBenchmark, SecurityBenchmark} from '../benchmark/benchmark.type';
import {fixedInterestBenchmark} from '../benchmark/fixed-interest-benchmark';
import {securityBenchmark} from '../benchmark/security-cash-flow-based-benchmark';
import {RebasedDepotValue} from './rebased-depot-value.type';
import {benchmarkResult} from './benchmark-result';

jest.mock('../benchmark/fixed-interest-benchmark', (): unknown => ({fixedInterestBenchmark: jest.fn()}));
jest.mock('../benchmark/security-cash-flow-based-benchmark', (): unknown => ({securityBenchmark: jest.fn()}));
jest.mock('../../../../common/pipe/security-name.pipe', (): unknown => ({SecurityNamePipe: jest.fn()}));

type FixedInterestFunction = (benchmark: FixedInterestBenchmark, depotValues: RebasedDepotValue[]) => BenchmarkResult;
type SecurityFunction = (benchmark: SecurityBenchmark, depotValues: RebasedDepotValue[], prices: HistoricalSecurityPrice[],
                         securityNamePipe: SecurityNamePipe) => BenchmarkResult | null;

describe('benchmarkResult', (): void => {
  const securityId: number = 7;

  let fixedInterestMock: jest.Mock<FixedInterestFunction>;
  let securityMock: jest.Mock<SecurityFunction>;
  let globalStore: Store<AppState>;
  let benchmark: WritableSignal<Benchmark | null>;
  let benchmarkPrices: WritableSignal<HistoricalSecurityPrice[]>;
  let depotValues: WritableSignal<RebasedDepotValue[]>;
  let securityBenchmarkInput: SecurityBenchmark;
  let result: Signal<BenchmarkResult | [BenchmarkResult, BenchmarkResult] | null>;

  beforeEach((): void => {
    fixedInterestMock = fixedInterestBenchmark as unknown as jest.Mock<FixedInterestFunction>;
    fixedInterestMock.mockReset();
    securityMock = securityBenchmark as unknown as jest.Mock<SecurityFunction>;
    securityMock.mockReset();
    (SecurityNamePipe as unknown as jest.Mock<(store: unknown) => void>).mockReset();
    globalStore = {} as Store<AppState>;

    securityBenchmarkInput = {
      type: 'security',
      mode: 'cashFlowBased',
      securityId,
      initialInvestment: 100
    };
    benchmark = signal<Benchmark | null>(securityBenchmarkInput);
    benchmarkPrices = signal<HistoricalSecurityPrice[]>([historicalSecurityPriceFactory({securityId, price: 11})]);
    depotValues = signal<RebasedDepotValue[]>([rebasedDepotValueFactory()]);
    result = createResult();
  });

  function createResult(): Signal<BenchmarkResult | [BenchmarkResult, BenchmarkResult] | null> {
    return benchmarkResult({benchmark, benchmarkPrices} as unknown as Parameters<typeof benchmarkResult>[0], depotValues, globalStore);
  }

  it('is empty without a benchmark', (): void => {
    benchmark.set(null);

    expect(result()).toBeNull();
    expect(securityMock).not.toHaveBeenCalled();
    expect(fixedInterestMock).not.toHaveBeenCalled();
  });

  describe('security benchmark', (): void => {
    let pipeConstructor: jest.Mock<(store: unknown) => void>;
    let securityResult: BenchmarkResult;

    beforeEach((): void => {
      pipeConstructor = SecurityNamePipe as unknown as jest.Mock<(store: unknown) => void>;
      securityResult = {
        name: 'Security',
        values: [1, 2]
      };
      securityMock.mockReturnValue(securityResult);
    });

    it('hands the security benchmark, the depot values, its prices and the name pipe to the security benchmark', (): void => {
      const prices: HistoricalSecurityPrice[] = benchmarkPrices();

      expect(result()).toBe(securityResult);
      expect(securityMock).toHaveBeenCalledTimes(1);
      expect(securityMock).toHaveBeenCalledWith(securityBenchmarkInput, depotValues(), prices,
        pipeConstructor.mock.instances[0] as unknown as SecurityNamePipe);
      expect(pipeConstructor.mock.calls).toEqual([[globalStore]]);
      expect(fixedInterestMock).not.toHaveBeenCalled();
    });

    it('ignores prices of another security', (): void => {
      const own: HistoricalSecurityPrice = historicalSecurityPriceFactory({securityId, date: '2026-01-02'});
      benchmarkPrices.set([historicalSecurityPriceFactory({securityId: securityId + 1}), own]);

      result();

      expect(securityMock.mock.calls[0][2]).toEqual([own]);
    });

    it('is empty while the prices are not loaded', (): void => {
      securityMock.mockReturnValue(null);
      benchmarkPrices.set([]);

      expect(result()).toBeNull();
      expect(securityMock.mock.calls[0][2]).toEqual([]);
    });

    it('is empty without depot values', (): void => {
      depotValues.set([]);

      expect(result()).toBeNull();
      expect(securityMock).not.toHaveBeenCalled();
    });
  });

  describe('fixed interest benchmark', (): void => {
    let fixedInterestBenchmarkInput: FixedInterestBenchmark;
    let fixedInterestResult: BenchmarkResult;

    beforeEach((): void => {
      fixedInterestBenchmarkInput = {
        type: 'fixedInterest',
        mode: 'cashFlowBased',
        interestPerYear: 1,
        daysPerYear: 365,
        yieldInterval: 'monthly'
      };
      fixedInterestResult = {
        name: 'Fixed Interest Benchmark',
        values: [3, 4]
      };
      fixedInterestMock.mockReturnValue(fixedInterestResult);
      benchmark.set(fixedInterestBenchmarkInput);
    });

    it('hands the fixed interest benchmark and the depot values to the fixed interest benchmark', (): void => {
      expect(result()).toBe(fixedInterestResult);
      expect(fixedInterestMock.mock.calls).toEqual([[fixedInterestBenchmarkInput, depotValues()]]);
      expect(securityMock).not.toHaveBeenCalled();
    });

    it('is empty without depot values', (): void => {
      depotValues.set([]);

      expect(result()).toBeNull();
      expect(fixedInterestMock).not.toHaveBeenCalled();
    });
  });
});
