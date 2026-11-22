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
import {buyAndHold} from './buy-and-hold';
import {fillPriceGaps} from './fill-price-gaps';

jest.mock('./prices-per-day', (): unknown => ({pricesPerDay: jest.fn()}));
jest.mock('./get-cash-flows', (): unknown => ({getCashFlows: jest.fn()}));
jest.mock('./buy-and-hold', (): unknown => ({buyAndHold: jest.fn()}));
jest.mock('./fill-price-gaps', (): unknown => ({fillPriceGaps: jest.fn()}));

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
    jest.mocked(pricesPerDay).mockReturnValue([10, 0, 25, 50]);

    jest.mocked(fillPriceGaps).mockReset();
    jest.mocked(fillPriceGaps).mockReturnValue([10, 10, 25, 50]);

    jest.mocked(getCashFlows).mockReset();
    jest.mocked(getCashFlows).mockReturnValue([
      {date: '2026-01-01', cashFlow: 0},
      {date: '2026-01-03', cashFlow: 50}
    ]);

    jest.mocked(buyAndHold).mockReset();
    jest.mocked(buyAndHold).mockReturnValue([1, 2, 3, 4]);

    transform = jest.fn<(securityId: number) => string>((): string => 'Security Name');
    securityNamePipe = {transform} as unknown as SecurityNamePipe;
  });

  it('buys with the initial investment on the first day and with each capital increase on its own day', (): void => {
    const result: BenchmarkResult | null = securityCashFlowBasedBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toEqual({
      name: 'Security Name',
      values: [1, 2, 3, 4]
    });
    expect(jest.mocked(pricesPerDay).mock.calls).toEqual([[depotValues, prices]]);
    expect(jest.mocked(fillPriceGaps).mock.calls).toEqual([[[10, 0, 25, 50]]]);
    expect(jest.mocked(getCashFlows).mock.calls).toEqual([[depotValues]]);
    expect(jest.mocked(buyAndHold).mock.calls).toEqual([[[100, 0, 50, 0], [10, 10, 25, 50]]]);
    expect(transform.mock.calls).toEqual([[securityId]]);
  });

  it('counts an empty initial investment as zero', (): void => {
    benchmark = {
      type: 'security',
      mode: 'cashFlowBased',
      securityId
    };

    securityCashFlowBasedBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(jest.mocked(buyAndHold).mock.calls).toEqual([[[0, 0, 50, 0], [10, 10, 25, 50]]]);
  });

  it('returns null without a price for the first day', (): void => {
    jest.mocked(pricesPerDay).mockReturnValue(null);

    const result: BenchmarkResult | null = securityCashFlowBasedBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toBeNull();
    expect(getCashFlows).not.toHaveBeenCalled();
    expect(fillPriceGaps).not.toHaveBeenCalled();
    expect(buyAndHold).not.toHaveBeenCalled();
    expect(transform).not.toHaveBeenCalled();
  });
});
