import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {getYear, parseISO} from 'date-fns';
import {securityLuckyInvestorBenchmark} from './security-lucky-investor-benchmark';
import {BenchmarkResult, SecurityLuckyInvestorBenchmark} from './benchmark.type';
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
jest.mock('date-fns', (): unknown => ({getYear: jest.fn(), parseISO: jest.fn()}));

type LuckyInvestorResult = [BenchmarkResult, BenchmarkResult] | null;
type ParseISO = (date: string) => Date;
type GetYear = (date: Date) => number;

describe('securityLuckyInvestorBenchmark', (): void => {
  const securityId: number = 7;

  let benchmark: SecurityLuckyInvestorBenchmark;
  let depotValues: RebasedDepotValue[];
  let prices: HistoricalSecurityPrice[];
  let transform: jest.Mock<(securityId: number) => string>;
  let securityNamePipe: SecurityNamePipe;
  let parseISOMock: jest.Mock<ParseISO>;
  let getYearMock: jest.Mock<GetYear>;

  beforeEach((): void => {
    parseISOMock = parseISO as unknown as jest.Mock<ParseISO>;
    parseISOMock.mockReset();
    parseISOMock.mockImplementation((date: string): Date => new Date(`${date}T00:00`));

    getYearMock = getYear as unknown as jest.Mock<GetYear>;
    getYearMock.mockReset();
    getYearMock.mockImplementation((date: Date): number => date.getFullYear());

    benchmark = {
      type: 'security',
      mode: 'luckyInvestor',
      securityId,
      initialInvestment: 100
    };

    depotValues = [
      rebasedDepotValueFactory({date: '2026-01-02'}),
      rebasedDepotValueFactory({date: '2026-01-05'}),
      rebasedDepotValueFactory({date: '2026-01-06'}),
      rebasedDepotValueFactory({date: '2026-01-07'})
    ];
    prices = [historicalSecurityPriceFactory({securityId})];

    jest.mocked(pricesPerDay).mockReset();
    jest.mocked(pricesPerDay).mockReturnValue([20, 0, 40, 25]);

    jest.mocked(fillPriceGaps).mockReset();
    jest.mocked(fillPriceGaps).mockReturnValue([20, 10, 40, 25]);

    jest.mocked(getCashFlows).mockReset();
    jest.mocked(getCashFlows).mockReturnValue([
      {date: '2026-01-02', cashFlow: 0},
      {date: '2026-01-06', cashFlow: 40},
      {date: '2026-01-07', cashFlow: 60}
    ]);

    jest.mocked(buyAndHold).mockReset();
    jest.mocked(buyAndHold)
      .mockReturnValueOnce([1, 2, 3, 4])
      .mockReturnValueOnce([5, 6, 7, 8]);

    transform = jest.fn<(securityId: number) => string>((): string => 'Security Name');
    securityNamePipe = {transform} as unknown as SecurityNamePipe;
  });

  it('invests the year\'s money on its cheapest and on its most expensive day, money gained later that year included', (): void => {
    const result: LuckyInvestorResult = securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toEqual([
      {
        name: 'Security Name (lucky)',
        values: [1, 2, 3, 4]
      },
      {
        name: 'Security Name (unlucky)',
        values: [5, 6, 7, 8]
      }
    ]);
    expect(jest.mocked(buyAndHold).mock.calls).toEqual([
      // lucky: 100 + 40 + 60 on 2026-01-05
      [[0, 200, 0, 0], [20, 10, 40, 25]],
      // unlucky: 100 + 40 + 60 on 2026-01-06
      [[0, 0, 200, 0], [20, 10, 40, 25]]
    ]);
    expect(jest.mocked(pricesPerDay).mock.calls).toEqual([[depotValues, prices]]);
    expect(jest.mocked(fillPriceGaps).mock.calls).toEqual([[[20, 0, 40, 25]]]);
    expect(jest.mocked(getCashFlows).mock.calls).toEqual([[depotValues]]);
    expect(transform.mock.calls).toEqual([[securityId]]);

    // each day, the first day again for the initial investment, each cash flow
    const parsedDates: string[] = [
      '2026-01-02',
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
      '2026-01-02',
      '2026-01-02',
      '2026-01-06',
      '2026-01-07'
    ];
    expect(parseISOMock.mock.calls).toEqual(parsedDates.map((date: string): [string] => [date]));
    expect(getYearMock.mock.calls).toEqual(parsedDates.map((date: string): [Date] => [new Date(`${date}T00:00`)]));
  });

  it('counts an empty initial investment as zero', (): void => {
    benchmark = {
      type: 'security',
      mode: 'luckyInvestor',
      securityId
    };

    securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(jest.mocked(buyAndHold).mock.calls).toEqual([
      // lucky: 40 + 60 on 2026-01-05
      [[0, 100, 0, 0], [20, 10, 40, 25]],
      // unlucky: 40 + 60 on 2026-01-06
      [[0, 0, 100, 0], [20, 10, 40, 25]]
    ]);
  });

  it('buys lucky on the first day if it has the lowest price', (): void => {
    jest.mocked(fillPriceGaps).mockReturnValue([10, 20, 40, 25]);

    securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(jest.mocked(buyAndHold).mock.calls).toEqual([
      [[200, 0, 0, 0], [10, 20, 40, 25]],
      [[0, 0, 200, 0], [10, 20, 40, 25]]
    ]);
  });

  it('buys lucky on the latest of several days sharing the lowest price', (): void => {
    jest.mocked(fillPriceGaps).mockReturnValue([10, 20, 40, 10]);

    securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(jest.mocked(buyAndHold).mock.calls).toEqual([
      [[0, 0, 0, 200], [10, 20, 40, 10]],
      [[0, 0, 200, 0], [10, 20, 40, 10]]
    ]);
  });

  it('buys unlucky on the earliest of several days sharing the highest price', (): void => {
    jest.mocked(fillPriceGaps).mockReturnValue([20, 40, 10, 40]);

    securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(jest.mocked(buyAndHold).mock.calls).toEqual([
      [[0, 0, 200, 0], [20, 40, 10, 40]],
      [[0, 200, 0, 0], [20, 40, 10, 40]]
    ]);
  });

  it('buys lucky on the cheapest day priced above 0', (): void => {
    jest.mocked(fillPriceGaps).mockReturnValue([20, 0, 40, 25]);

    securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(jest.mocked(buyAndHold).mock.calls).toEqual([
      [[200, 0, 0, 0], [20, 0, 40, 25]],
      [[0, 0, 200, 0], [20, 0, 40, 25]]
    ]);
  });

  it('returns null without a price for the first day', (): void => {
    jest.mocked(pricesPerDay).mockReturnValue(null);

    const result: LuckyInvestorResult = securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toBeNull();
    expect(getCashFlows).not.toHaveBeenCalled();
    expect(fillPriceGaps).not.toHaveBeenCalled();
    expect(buyAndHold).not.toHaveBeenCalled();
    expect(transform).not.toHaveBeenCalled();
    expect(parseISOMock).not.toHaveBeenCalled();
    expect(getYearMock).not.toHaveBeenCalled();
  });

  describe('over two calendar years', (): void => {
    beforeEach((): void => {
      depotValues = [
        rebasedDepotValueFactory({date: '2025-12-29'}),
        rebasedDepotValueFactory({date: '2025-12-30'}),
        rebasedDepotValueFactory({date: '2025-12-31'}),
        rebasedDepotValueFactory({date: '2026-01-02'}),
        rebasedDepotValueFactory({date: '2026-01-05'}),
        rebasedDepotValueFactory({date: '2026-01-06'})
      ];

      jest.mocked(fillPriceGaps).mockReturnValue([20, 10, 40, 50, 25, 100]);

      jest.mocked(getCashFlows).mockReturnValue([
        {date: '2025-12-29', cashFlow: 0},
        {date: '2026-01-06', cashFlow: 200}
      ]);
    });

    it('invests each year\'s money on that year\'s own days', (): void => {
      securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

      expect(jest.mocked(buyAndHold).mock.calls).toEqual([
        // lucky: 100 on 2025-12-30, 200 on 2026-01-05
        [[0, 100, 0, 0, 200, 0], [20, 10, 40, 50, 25, 100]],
        // unlucky: 100 on 2025-12-31, 200 on 2026-01-06
        [[0, 0, 100, 0, 0, 200], [20, 10, 40, 50, 25, 100]]
      ]);
    });

    it('buys nothing in a year whose invested capital did not grow', (): void => {
      jest.mocked(getCashFlows).mockReturnValue([
        {date: '2025-12-29', cashFlow: 0}
      ]);

      securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

      expect(jest.mocked(buyAndHold).mock.calls).toEqual([
        [[0, 100, 0, 0, 0, 0], [20, 10, 40, 50, 25, 100]],
        [[0, 0, 100, 0, 0, 0], [20, 10, 40, 50, 25, 100]]
      ]);
    });

    it('keeps the money of a year after the last price above 0 as money on its first day in both series', (): void => {
      jest.mocked(fillPriceGaps).mockReturnValue([20, 10, 40, 0, 0, 0]);

      securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

      expect(jest.mocked(buyAndHold).mock.calls).toEqual([
        // lucky: 100 on 2025-12-30, 200 on 2026-01-02
        [[0, 100, 0, 200, 0, 0], [20, 10, 40, 0, 0, 0]],
        // unlucky: 100 on 2025-12-31, 200 on 2026-01-02
        [[0, 0, 100, 200, 0, 0], [20, 10, 40, 0, 0, 0]]
      ]);
    });

    it('buys nothing in a year before the first price above 0', (): void => {
      jest.mocked(fillPriceGaps).mockReturnValue([0, 0, 0, 50, 25, 100]);

      securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

      expect(jest.mocked(buyAndHold).mock.calls).toEqual([
        // the 100 of 2025 buys nothing
        [[0, 0, 0, 0, 200, 0], [0, 0, 0, 50, 25, 100]],
        [[0, 0, 0, 0, 0, 200], [0, 0, 0, 50, 25, 100]]
      ]);
    });
  });
});
