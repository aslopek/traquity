import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {securityIntervalBasedBenchmark} from './security-interval-based-benchmark';
import {BenchmarkResult, SecurityIntervalBasedBenchmark} from './benchmark.type';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {HistoricalSecurityPrice} from '../../../../gen/api/historical-security-price';
import {SecurityNamePipe} from '../../../../common/pipe/security-name.pipe';
import {rebasedDepotValueFactory} from '../../../../testing/rebased-depot-value.factory';
import {historicalSecurityPriceFactory} from '../../../../testing/historical-security-price.factory';
import {pricesPerDay} from './prices-per-day';
import {installmentsPerDay} from './installments-per-day';
import {buyAndHold} from './buy-and-hold';
import {fillPriceGaps} from './fill-price-gaps';

jest.mock('./prices-per-day', (): unknown => ({pricesPerDay: jest.fn()}));
jest.mock('./installments-per-day', (): unknown => ({installmentsPerDay: jest.fn()}));
jest.mock('./buy-and-hold', (): unknown => ({buyAndHold: jest.fn()}));
jest.mock('./fill-price-gaps', (): unknown => ({fillPriceGaps: jest.fn()}));

describe('securityIntervalBasedBenchmark', (): void => {
  const securityId: number = 7;

  let benchmark: SecurityIntervalBasedBenchmark;
  let depotValues: RebasedDepotValue[];
  let prices: HistoricalSecurityPrice[];
  let transform: jest.Mock<(securityId: number) => string>;
  let securityNamePipe: SecurityNamePipe;

  beforeEach((): void => {
    benchmark = {
      type: 'security',
      mode: 'intervalBased',
      securityId,
      initialInvestment: 100,
      depositInterval: 'monthly',
      depositDay: 15,
      investmentPerInterval: 50
    };

    depotValues = [
      rebasedDepotValueFactory({date: '2026-01-15'}),
      rebasedDepotValueFactory({date: '2026-01-16'}),
      rebasedDepotValueFactory({date: '2026-02-16'}),
      rebasedDepotValueFactory({date: '2026-02-17'})
    ];
    prices = [historicalSecurityPriceFactory({securityId})];

    jest.mocked(pricesPerDay).mockReset();
    jest.mocked(pricesPerDay).mockReturnValue([10, 0, 25, 50]);

    jest.mocked(fillPriceGaps).mockReset();
    jest.mocked(fillPriceGaps).mockReturnValue([10, 10, 25, 50]);

    jest.mocked(installmentsPerDay).mockReset();
    jest.mocked(installmentsPerDay).mockReturnValue([50, 0, 50, 0]);

    jest.mocked(buyAndHold).mockReset();
    jest.mocked(buyAndHold).mockReturnValue([1, 2, 3, 4]);

    transform = jest.fn<(securityId: number) => string>((): string => 'Security Name');
    securityNamePipe = {transform} as unknown as SecurityNamePipe;
  });

  it('buys with each installment on its own day and with the initial investment on top of the first day\'s installment', (): void => {
    const result: BenchmarkResult | null = securityIntervalBasedBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toEqual({
      name: 'Security Name',
      values: [1, 2, 3, 4]
    });
    expect(jest.mocked(pricesPerDay).mock.calls).toEqual([[depotValues, prices]]);
    expect(jest.mocked(fillPriceGaps).mock.calls).toEqual([[[10, 0, 25, 50]]]);
    expect(jest.mocked(installmentsPerDay).mock.calls).toEqual([[benchmark, depotValues]]);
    expect(jest.mocked(buyAndHold).mock.calls).toEqual([[[150, 0, 50, 0], [10, 10, 25, 50]]]);
    expect(transform.mock.calls).toEqual([[securityId]]);
  });

  it('buys with the initial investment alone on a first day without an installment', (): void => {
    jest.mocked(installmentsPerDay).mockReturnValue([0, 50, 0, 50]);

    securityIntervalBasedBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(jest.mocked(buyAndHold).mock.calls).toEqual([[[100, 50, 0, 50], [10, 10, 25, 50]]]);
  });

  it('counts an empty initial investment as zero', (): void => {
    benchmark = {
      type: 'security',
      mode: 'intervalBased',
      securityId,
      depositInterval: 'monthly',
      depositDay: 15,
      investmentPerInterval: 50
    };

    securityIntervalBasedBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(jest.mocked(buyAndHold).mock.calls).toEqual([[[50, 0, 50, 0], [10, 10, 25, 50]]]);
  });

  it('returns null without a price for the first day', (): void => {
    jest.mocked(pricesPerDay).mockReturnValue(null);

    const result: BenchmarkResult | null = securityIntervalBasedBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toBeNull();
    expect(installmentsPerDay).not.toHaveBeenCalled();
    expect(fillPriceGaps).not.toHaveBeenCalled();
    expect(buyAndHold).not.toHaveBeenCalled();
    expect(transform).not.toHaveBeenCalled();
  });
});
