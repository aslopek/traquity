import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {securityCashFlowBasedBenchmark} from './security-cash-flow-based-benchmark';
import {BenchmarkResult, SecurityCashFlowBasedBenchmark} from './benchmark.type';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {HistoricalSecurityPrice} from '../../../../gen/api/historical-security-price';
import {SecurityNamePipe} from '../../../../common/pipe/security-name.pipe';
import {rebasedDepotValueFactory} from '../../../../testing/rebased-depot-value.factory';
import {historicalSecurityPriceFactory} from '../../../../testing/historical-security-price.factory';
import {pricesPerDay} from './prices-per-day';
import {getCashFlows} from './get-cash-flows';

jest.mock('./prices-per-day', (): unknown => ({pricesPerDay: jest.fn()}));
jest.mock('./get-cash-flows', (): unknown => ({getCashFlows: jest.fn()}));

describe('securityCashFlowBasedBenchmark', (): void => {
  const securityId: number = 7;

  let benchmark: SecurityCashFlowBasedBenchmark;
  let depotValues: RebasedDepotValue[];
  let prices: HistoricalSecurityPrice[];
  let transform: jest.Mock<(securityId: number) => string>;
  let securityNamePipe: SecurityNamePipe;

  beforeEach((): void => {
    benchmark = {
      type: 'security',
      mode: 'cashFlowBased',
      securityId,
      initialInvestment: 100
    };

    depotValues = [
      rebasedDepotValueFactory({date: '2026-01-01'}),
      rebasedDepotValueFactory({date: '2026-01-02'}),
      rebasedDepotValueFactory({date: '2026-01-03'}),
      rebasedDepotValueFactory({date: '2026-01-04'})
    ];
    prices = [historicalSecurityPriceFactory({securityId})];

    jest.mocked(pricesPerDay).mockReset();
    jest.mocked(pricesPerDay).mockReturnValue([10, 20, 25, 50]);

    jest.mocked(getCashFlows).mockReset();
    jest.mocked(getCashFlows).mockReturnValue([
      {date: '2026-01-01', cashFlow: 0},
      {date: '2026-01-03', cashFlow: 50}
    ]);

    transform = jest.fn<(securityId: number) => string>((): string => 'Security Name');
    securityNamePipe = {transform} as unknown as SecurityNamePipe;
  });

  it('values the shares bought with the initial investment and each capital increase at the day\'s price', (): void => {
    const result: BenchmarkResult | null = securityCashFlowBasedBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toEqual({
      name: 'Security Name',
      // 100 / 10 = 10 shares from 2026-01-01, 50 / 25 = 2 more from 2026-01-03
      values: [100, 200, 300, 600]
    });
    expect(jest.mocked(pricesPerDay).mock.calls).toEqual([[depotValues, prices]]);
    expect(jest.mocked(getCashFlows).mock.calls).toEqual([[depotValues]]);
    expect(transform.mock.calls).toEqual([[securityId]]);
  });

  it('values a day priced 0 at 0', (): void => {
    jest.mocked(pricesPerDay).mockReturnValue([10, 0, 25, 50]);

    const result: BenchmarkResult | null = securityCashFlowBasedBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toEqual({
      name: 'Security Name',
      // 100 / 10 = 10 shares from 2026-01-01, 50 / 25 = 2 more from 2026-01-03
      values: [100, 0, 300, 600]
    });
  });

  it('buys with money due on a day priced 0 on the next day priced above 0', (): void => {
    jest.mocked(pricesPerDay).mockReturnValue([10, 20, 0, 50]);

    const result: BenchmarkResult | null = securityCashFlowBasedBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toEqual({
      name: 'Security Name',
      // 100 / 10 = 10 shares from 2026-01-01, 50 / 50 = 1 more from 2026-01-04
      values: [100, 200, 0, 550]
    });
  });

  it('buys with the initial investment on the next day priced above 0 if the first day is priced 0', (): void => {
    jest.mocked(pricesPerDay).mockReturnValue([0, 20, 25, 50]);

    const result: BenchmarkResult | null = securityCashFlowBasedBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toEqual({
      name: 'Security Name',
      // 100 / 20 = 5 shares from 2026-01-02, 50 / 25 = 2 more from 2026-01-03
      values: [0, 100, 175, 350]
    });
  });

  it('returns null without a price for the first day', (): void => {
    jest.mocked(pricesPerDay).mockReturnValue(null);

    const result: BenchmarkResult | null = securityCashFlowBasedBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toBeNull();
    expect(getCashFlows).not.toHaveBeenCalled();
    expect(transform).not.toHaveBeenCalled();
  });

  describe('without an initial investment', (): void => {
    beforeEach((): void => {
      benchmark = {
        type: 'security',
        mode: 'cashFlowBased',
        securityId
      };
    });

    it('starts at zero and buys shares from later capital increases only', (): void => {
      const result: BenchmarkResult | null = securityCashFlowBasedBenchmark(benchmark, depotValues, prices, securityNamePipe);

      expect(result).toEqual({
        name: 'Security Name',
        // 50 / 25 = 2 shares from 2026-01-03
        values: [0, 0, 50, 100]
      });
    });

    it('stays at zero without capital increases', (): void => {
      jest.mocked(getCashFlows).mockReturnValue([
        {date: '2026-01-01', cashFlow: 0}
      ]);

      const result: BenchmarkResult | null = securityCashFlowBasedBenchmark(benchmark, depotValues, prices, securityNamePipe);

      expect(result).toEqual({
        name: 'Security Name',
        values: [0, 0, 0, 0]
      });
    });
  });
});
