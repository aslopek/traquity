import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {Store} from '@ngrx/store';
import {HistoricalSecurityPrice} from '../../../../gen/api/historical-security-price';
import {SecurityNamePipe} from '../../../../common/pipe/security-name.pipe';
import {AppState} from '../../../../store/app.state';
import {rebasedDepotValueFactory} from '../../../../testing/rebased-depot-value.factory';
import {historicalSecurityPriceFactory} from '../../../../testing/historical-security-price.factory';
import {
  Benchmark,
  BenchmarkResult,
  FixedInterestBenchmark,
  SecurityCashFlowBasedBenchmark,
  SecurityIntervalBasedBenchmark,
  SecurityLuckyInvestorBenchmark
} from '../benchmark/benchmark.type';
import {fixedInterestBenchmark} from '../benchmark/fixed-interest-benchmark';
import {securityCashFlowBasedBenchmark} from '../benchmark/security-cash-flow-based-benchmark';
import {securityIntervalBasedBenchmark} from '../benchmark/security-interval-based-benchmark';
import {securityLuckyInvestorBenchmark} from '../benchmark/security-lucky-investor-benchmark';
import {RebasedDepotValue} from './rebased-depot-value.type';
import {benchmarkResult} from './benchmark-result';

jest.mock('../benchmark/fixed-interest-benchmark', (): unknown => ({fixedInterestBenchmark: jest.fn()}));
jest.mock('../benchmark/security-cash-flow-based-benchmark', (): unknown => ({securityCashFlowBasedBenchmark: jest.fn()}));
jest.mock('../benchmark/security-interval-based-benchmark', (): unknown => ({securityIntervalBasedBenchmark: jest.fn()}));
jest.mock('../benchmark/security-lucky-investor-benchmark', (): unknown => ({securityLuckyInvestorBenchmark: jest.fn()}));
jest.mock('../../../../common/pipe/security-name.pipe', (): unknown => ({SecurityNamePipe: jest.fn()}));

type FixedInterestFunction = (benchmark: FixedInterestBenchmark, depotValues: RebasedDepotValue[]) => BenchmarkResult;
type CashFlowBasedFunction = typeof securityCashFlowBasedBenchmark;
type IntervalBasedFunction = typeof securityIntervalBasedBenchmark;
type LuckyInvestorFunction = typeof securityLuckyInvestorBenchmark;

describe('benchmarkResult', (): void => {
  const securityId: number = 7;

  let fixedInterestMock: jest.Mock<FixedInterestFunction>;
  let cashFlowBasedMock: jest.Mock<CashFlowBasedFunction>;
  let intervalBasedMock: jest.Mock<IntervalBasedFunction>;
  let luckyInvestorMock: jest.Mock<LuckyInvestorFunction>;
  let globalStore: Store<AppState>;
  let benchmark: WritableSignal<Benchmark | null>;
  let benchmarkPrices: WritableSignal<HistoricalSecurityPrice[]>;
  let depotValues: WritableSignal<RebasedDepotValue[]>;
  let securityBenchmarkInput: SecurityCashFlowBasedBenchmark;
  let result: Signal<BenchmarkResult | [BenchmarkResult, BenchmarkResult] | null>;

  beforeEach((): void => {
    fixedInterestMock = fixedInterestBenchmark as unknown as jest.Mock<FixedInterestFunction>;
    fixedInterestMock.mockReset();
    cashFlowBasedMock = securityCashFlowBasedBenchmark as unknown as jest.Mock<CashFlowBasedFunction>;
    cashFlowBasedMock.mockReset();
    intervalBasedMock = securityIntervalBasedBenchmark as unknown as jest.Mock<IntervalBasedFunction>;
    intervalBasedMock.mockReset();
    luckyInvestorMock = securityLuckyInvestorBenchmark as unknown as jest.Mock<LuckyInvestorFunction>;
    luckyInvestorMock.mockReset();
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
    expect(cashFlowBasedMock).not.toHaveBeenCalled();
    expect(intervalBasedMock).not.toHaveBeenCalled();
    expect(luckyInvestorMock).not.toHaveBeenCalled();
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
      cashFlowBasedMock.mockReturnValue(securityResult);
    });

    it('hands a cashflow based benchmark, the depot values, its prices and the name pipe to the cashflow based benchmark', (): void => {
      const prices: HistoricalSecurityPrice[] = benchmarkPrices();

      expect(result()).toBe(securityResult);
      expect(cashFlowBasedMock).toHaveBeenCalledTimes(1);
      expect(cashFlowBasedMock).toHaveBeenCalledWith(securityBenchmarkInput, depotValues(), prices,
        pipeConstructor.mock.instances[0] as unknown as SecurityNamePipe);
      expect(pipeConstructor.mock.calls).toEqual([[globalStore]]);
      expect(intervalBasedMock).not.toHaveBeenCalled();
      expect(luckyInvestorMock).not.toHaveBeenCalled();
      expect(fixedInterestMock).not.toHaveBeenCalled();
    });

    it('ignores prices of another security', (): void => {
      const own: HistoricalSecurityPrice = historicalSecurityPriceFactory({securityId, date: '2026-01-02'});
      benchmarkPrices.set([historicalSecurityPriceFactory({securityId: securityId + 1}), own]);

      result();

      expect(cashFlowBasedMock.mock.calls[0][2]).toEqual([own]);
    });

    it('is empty while the prices are not loaded', (): void => {
      cashFlowBasedMock.mockReturnValue(null);
      benchmarkPrices.set([]);

      expect(result()).toBeNull();
      expect(cashFlowBasedMock.mock.calls[0][2]).toEqual([]);
    });

    it('is empty without depot values', (): void => {
      depotValues.set([]);

      expect(result()).toBeNull();
      expect(cashFlowBasedMock).not.toHaveBeenCalled();
    });

    describe('in the lucky investor mode', (): void => {
      let luckyInvestorBenchmarkInput: SecurityLuckyInvestorBenchmark;
      let luckyInvestorResult: [BenchmarkResult, BenchmarkResult];

      beforeEach((): void => {
        luckyInvestorBenchmarkInput = {
          type: 'security',
          mode: 'luckyInvestor',
          securityId,
          initialInvestment: 100
        };
        luckyInvestorResult = [
          {
            name: 'Security (lucky)',
            values: [1, 2]
          },
          {
            name: 'Security (unlucky)',
            values: [3, 4]
          }
        ];
        luckyInvestorMock.mockReturnValue(luckyInvestorResult);
        benchmark.set(luckyInvestorBenchmarkInput);
      });

      it('hands the benchmark, the depot values, its prices and the name pipe to the lucky investor benchmark', (): void => {
        const prices: HistoricalSecurityPrice[] = benchmarkPrices();

        expect(result()).toBe(luckyInvestorResult);
        expect(luckyInvestorMock).toHaveBeenCalledTimes(1);
        expect(luckyInvestorMock).toHaveBeenCalledWith(luckyInvestorBenchmarkInput, depotValues(), prices,
          pipeConstructor.mock.instances[0] as unknown as SecurityNamePipe);
        expect(pipeConstructor.mock.calls).toEqual([[globalStore]]);
        expect(cashFlowBasedMock).not.toHaveBeenCalled();
        expect(intervalBasedMock).not.toHaveBeenCalled();
        expect(fixedInterestMock).not.toHaveBeenCalled();
      });
    });

    describe('in the regular investments mode', (): void => {
      let intervalBasedBenchmarkInput: SecurityIntervalBasedBenchmark;
      let intervalBasedResult: BenchmarkResult;

      beforeEach((): void => {
        intervalBasedBenchmarkInput = {
          type: 'security',
          mode: 'intervalBased',
          securityId,
          initialInvestment: 100,
          depositInterval: 'monthly',
          depositDay: 1,
          investmentPerInterval: 'reinvestCashFlow'
        };
        intervalBasedResult = {
          name: 'Security',
          values: [5, 6]
        };
        intervalBasedMock.mockReturnValue(intervalBasedResult);
        benchmark.set(intervalBasedBenchmarkInput);
      });

      it('hands the benchmark, the depot values, its prices and the name pipe to the regular investments benchmark', (): void => {
        const prices: HistoricalSecurityPrice[] = benchmarkPrices();

        expect(result()).toBe(intervalBasedResult);
        expect(intervalBasedMock).toHaveBeenCalledTimes(1);
        expect(intervalBasedMock).toHaveBeenCalledWith(intervalBasedBenchmarkInput, depotValues(), prices,
          pipeConstructor.mock.instances[0] as unknown as SecurityNamePipe);
        expect(pipeConstructor.mock.calls).toEqual([[globalStore]]);
        expect(cashFlowBasedMock).not.toHaveBeenCalled();
        expect(luckyInvestorMock).not.toHaveBeenCalled();
        expect(fixedInterestMock).not.toHaveBeenCalled();
      });
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
      expect(cashFlowBasedMock).not.toHaveBeenCalled();
      expect(intervalBasedMock).not.toHaveBeenCalled();
      expect(luckyInvestorMock).not.toHaveBeenCalled();
    });

    it('is empty without depot values', (): void => {
      depotValues.set([]);

      expect(result()).toBeNull();
      expect(fixedInterestMock).not.toHaveBeenCalled();
    });
  });
});
