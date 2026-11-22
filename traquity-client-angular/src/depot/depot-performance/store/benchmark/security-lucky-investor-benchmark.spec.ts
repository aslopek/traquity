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

jest.mock('./prices-per-day', (): unknown => ({pricesPerDay: jest.fn()}));
jest.mock('./get-cash-flows', (): unknown => ({getCashFlows: jest.fn()}));
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
    jest.mocked(pricesPerDay).mockReturnValue([20, 10, 40, 25]);

    jest.mocked(getCashFlows).mockReset();
    jest.mocked(getCashFlows).mockReturnValue([
      {date: '2026-01-02', cashFlow: 0},
      {date: '2026-01-06', cashFlow: 40},
      {date: '2026-01-07', cashFlow: 60}
    ]);

    transform = jest.fn<(securityId: number) => string>((): string => 'Security Name');
    securityNamePipe = {transform} as unknown as SecurityNamePipe;
  });

  it('invests the year\'s money on its cheapest and on its most expensive day, money gained later that year included', (): void => {
    const result: LuckyInvestorResult = securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toEqual([
      {
        name: 'Security Name (lucky)',
        // (100 + 40 + 60) / 10 = 20 shares from 2026-01-05
        values: [0, 200, 800, 500]
      },
      {
        name: 'Security Name (unlucky)',
        // (100 + 40 + 60) / 40 = 5 shares from 2026-01-06
        values: [0, 0, 200, 125]
      }
    ]);
    expect(jest.mocked(pricesPerDay).mock.calls).toEqual([[depotValues, prices]]);
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

    const result: LuckyInvestorResult = securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toEqual([
      {
        name: 'Security Name (lucky)',
        // (40 + 60) / 10 = 10 shares from 2026-01-05
        values: [0, 100, 400, 250]
      },
      {
        name: 'Security Name (unlucky)',
        // (40 + 60) / 40 = 2.5 shares from 2026-01-06
        values: [0, 0, 100, 62.5]
      }
    ]);
  });

  it('buys lucky on the first day if it has the lowest price', (): void => {
    jest.mocked(pricesPerDay).mockReturnValue([10, 20, 40, 25]);

    const result: LuckyInvestorResult = securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toEqual([
      {
        name: 'Security Name (lucky)',
        // (100 + 40 + 60) / 10 = 20 shares from 2026-01-02
        values: [200, 400, 800, 500]
      },
      {
        name: 'Security Name (unlucky)',
        // (100 + 40 + 60) / 40 = 5 shares from 2026-01-06
        values: [0, 0, 200, 125]
      }
    ]);
  });

  it('buys lucky on the latest of several days sharing the lowest price', (): void => {
    jest.mocked(pricesPerDay).mockReturnValue([10, 20, 40, 10]);

    const result: LuckyInvestorResult = securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toEqual([
      {
        name: 'Security Name (lucky)',
        // (100 + 40 + 60) / 10 = 20 shares from 2026-01-07
        values: [0, 0, 0, 200]
      },
      {
        name: 'Security Name (unlucky)',
        // (100 + 40 + 60) / 40 = 5 shares from 2026-01-06
        values: [0, 0, 200, 50]
      }
    ]);
  });

  it('buys unlucky on the earliest of several days sharing the highest price', (): void => {
    jest.mocked(pricesPerDay).mockReturnValue([20, 40, 10, 40]);

    const result: LuckyInvestorResult = securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toEqual([
      {
        name: 'Security Name (lucky)',
        // (100 + 40 + 60) / 10 = 20 shares from 2026-01-06
        values: [0, 0, 200, 800]
      },
      {
        name: 'Security Name (unlucky)',
        // (100 + 40 + 60) / 40 = 5 shares from 2026-01-05
        values: [0, 200, 50, 200]
      }
    ]);
  });

  it('buys lucky on the cheapest day priced above 0', (): void => {
    jest.mocked(pricesPerDay).mockReturnValue([20, 0, 40, 25]);

    const result: LuckyInvestorResult = securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toEqual([
      {
        name: 'Security Name (lucky)',
        // (100 + 40 + 60) / 20 = 10 shares from 2026-01-02
        values: [200, 0, 400, 250]
      },
      {
        name: 'Security Name (unlucky)',
        // (100 + 40 + 60) / 40 = 5 shares from 2026-01-06
        values: [0, 0, 200, 125]
      }
    ]);
  });

  it('returns null without a price for the first day', (): void => {
    jest.mocked(pricesPerDay).mockReturnValue(null);

    const result: LuckyInvestorResult = securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

    expect(result).toBeNull();
    expect(getCashFlows).not.toHaveBeenCalled();
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

      jest.mocked(pricesPerDay).mockReturnValue([20, 10, 40, 50, 25, 100]);

      jest.mocked(getCashFlows).mockReturnValue([
        {date: '2025-12-29', cashFlow: 0},
        {date: '2026-01-06', cashFlow: 200}
      ]);
    });

    it('invests each year\'s money on that year\'s own days', (): void => {
      const result: LuckyInvestorResult = securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

      expect(result).toEqual([
        {
          name: 'Security Name (lucky)',
          // 100 / 10 = 10 shares from 2025-12-30, 200 / 25 = 8 more from 2026-01-05
          values: [0, 100, 400, 500, 450, 1800]
        },
        {
          name: 'Security Name (unlucky)',
          // 100 / 40 = 2.5 shares from 2025-12-31, 200 / 100 = 2 more from 2026-01-06
          values: [0, 0, 100, 125, 62.5, 450]
        }
      ]);
    });

    it('buys nothing in a year whose invested capital did not grow', (): void => {
      jest.mocked(getCashFlows).mockReturnValue([
        {date: '2025-12-29', cashFlow: 0}
      ]);

      const result: LuckyInvestorResult = securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

      expect(result).toEqual([
        {
          name: 'Security Name (lucky)',
          // 100 / 10 = 10 shares from 2025-12-30
          values: [0, 100, 400, 500, 250, 1000]
        },
        {
          name: 'Security Name (unlucky)',
          // 100 / 40 = 2.5 shares from 2025-12-31
          values: [0, 0, 100, 125, 62.5, 250]
        }
      ]);
    });

    it('buys nothing in a year without a price above 0', (): void => {
      jest.mocked(pricesPerDay).mockReturnValue([0, 0, 0, 50, 25, 100]);

      const result: LuckyInvestorResult = securityLuckyInvestorBenchmark(benchmark, depotValues, prices, securityNamePipe);

      expect(result).toEqual([
        {
          name: 'Security Name (lucky)',
          // the 100 of 2025 buys nothing, 200 / 25 = 8 shares from 2026-01-05
          values: [0, 0, 0, 0, 200, 800]
        },
        {
          name: 'Security Name (unlucky)',
          // the 100 of 2025 buys nothing, 200 / 100 = 2 shares from 2026-01-06
          values: [0, 0, 0, 0, 0, 200]
        }
      ]);
    });
  });
});
