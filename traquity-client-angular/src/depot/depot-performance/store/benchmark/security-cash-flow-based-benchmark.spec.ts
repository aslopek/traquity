import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {securityBenchmark} from './security-cash-flow-based-benchmark';
import {BenchmarkResult, SecurityBenchmark} from './benchmark.type';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {HistoricalSecurityPrice} from '../../../../gen/api/historical-security-price';
import {SecurityNamePipe} from '../../../../common/pipe/security-name.pipe';
import {rebasedDepotValueFactory} from '../../../../testing/rebased-depot-value.factory';
import {historicalSecurityPriceFactory} from '../../../../testing/historical-security-price.factory';

describe('securityBenchmark', (): void => {
  const securityId: number = 7;
  const initialInvestment: number = 100;
  const dates: string[] = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04'];
  const investedCapitalValues: number[] = [100, 100, 150, 150];
  const dailyPrices: number[] = [10, 20, 25, 50];

  let benchmark: SecurityBenchmark;
  let depotValues: RebasedDepotValue[];
  let prices: HistoricalSecurityPrice[];
  let securityName: string;
  let transform: jest.Mock<(securityId: number) => string>;
  let securityNamePipe: SecurityNamePipe;

  beforeEach((): void => {
    benchmark = {
      type: 'security',
      mode: 'cashFlowBased',
      securityId,
      initialInvestment
    };

    depotValues = dates.map((date: string, index: number): RebasedDepotValue => rebasedDepotValueFactory({
      date,
      investedCapital: investedCapitalValues[index]
    }));

    prices = dates.map((date: string, index: number): HistoricalSecurityPrice => historicalSecurityPriceFactory({
      securityId,
      date,
      price: dailyPrices[index]
    }));

    securityName = 'Security Name';
    transform = jest.fn<(securityId: number) => string>((): string => securityName);
    securityNamePipe = {transform} as unknown as SecurityNamePipe;
  });

  function expectValues(result: BenchmarkResult | null, expected: number[]): void {
    expect(result?.values).toHaveLength(expected.length);
    expected.forEach((value: number, index: number): void => expect(result?.values[index]).toBeCloseTo(value, 9));
  }

  it('values the shares bought with the initial investment and each capital increase at the day\'s price', (): void => {
    const sharesDay1: number = initialInvestment / dailyPrices[0];
    const sharesDay3: number = sharesDay1 + (investedCapitalValues[2] - investedCapitalValues[1]) / dailyPrices[2];

    const result: BenchmarkResult | null = securityBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expectValues(result, [
      sharesDay1 * dailyPrices[0],
      sharesDay1 * dailyPrices[1],
      sharesDay3 * dailyPrices[2],
      sharesDay3 * dailyPrices[3]
    ]);
  });

  it('names the series after the security', (): void => {
    const result: BenchmarkResult | null = securityBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result?.name).toBe(securityName);
    expect(transform.mock.calls).toEqual([[securityId]]);
  });

  it('values a day without a price at the latest earlier price, a purchase on that day included', (): void => {
    prices = [prices[0], prices[1], prices[3]];
    const sharesDay1: number = initialInvestment / dailyPrices[0];
    const sharesDay3: number = sharesDay1 + (investedCapitalValues[2] - investedCapitalValues[1]) / dailyPrices[1];

    const result: BenchmarkResult | null = securityBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expectValues(result, [
      sharesDay1 * dailyPrices[0],
      sharesDay1 * dailyPrices[1],
      sharesDay3 * dailyPrices[1],
      sharesDay3 * dailyPrices[3]
    ]);
  });

  it('buys the initial investment at the latest price before the first day if the first day has none', (): void => {
    const earlierPrice: number = 4;
    prices = [
      historicalSecurityPriceFactory({securityId, date: '2025-12-30', price: earlierPrice}),
      prices[1],
      prices[2],
      prices[3]
    ];
    const sharesDay1: number = initialInvestment / earlierPrice;
    const sharesDay3: number = sharesDay1 + (investedCapitalValues[2] - investedCapitalValues[1]) / dailyPrices[2];

    const result: BenchmarkResult | null = securityBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expectValues(result, [
      sharesDay1 * earlierPrice,
      sharesDay1 * dailyPrices[1],
      sharesDay3 * dailyPrices[2],
      sharesDay3 * dailyPrices[3]
    ]);
  });

  it('starts at zero without an initial investment and buys shares from later capital increases only', (): void => {
    benchmark = {
      type: 'security',
      mode: 'cashFlowBased',
      securityId
    };
    const sharesDay3: number = (investedCapitalValues[2] - investedCapitalValues[1]) / dailyPrices[2];

    const result: BenchmarkResult | null = securityBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expectValues(result, [
      0,
      0,
      sharesDay3 * dailyPrices[2],
      sharesDay3 * dailyPrices[3]
    ]);
  });

  it('stays at zero for an initial investment of zero and a constant invested capital', (): void => {
    benchmark = {
      type: 'security',
      mode: 'cashFlowBased',
      securityId,
      initialInvestment: 0
    };
    depotValues = [
      rebasedDepotValueFactory({date: dates[0], investedCapital: 100}),
      rebasedDepotValueFactory({date: dates[1], investedCapital: 100}),
      rebasedDepotValueFactory({date: dates[2], investedCapital: 100}),
      rebasedDepotValueFactory({date: dates[3], investedCapital: 100})
    ];

    const result: BenchmarkResult | null = securityBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expectValues(result, [0, 0, 0, 0]);
  });

  it('returns null if the oldest price is younger than the first day', (): void => {
    prices = [prices[1], prices[2], prices[3]];

    expect(securityBenchmark(benchmark, depotValues, prices, securityNamePipe)).toBeNull();
  });

  it('returns null without prices', (): void => {
    expect(securityBenchmark(benchmark, depotValues, [], securityNamePipe)).toBeNull();
  });

  it('returns null without depot values', (): void => {
    expect(securityBenchmark(benchmark, [], prices, securityNamePipe)).toBeNull();
  });
});
