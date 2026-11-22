import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {differenceInDays, differenceInMonths, parseISO} from 'date-fns';
import {fixedInterestBenchmark} from './fixed-interest-benchmark';
import {FixedInterestBenchmark} from './benchmark.type';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {rebasedDepotValueFactory} from '../../../../testing/rebased-depot-value.factory';
import {installmentsPerDay} from './installments-per-day';
import {getCashFlows} from './get-cash-flows';

jest.mock('./installments-per-day', (): unknown => ({installmentsPerDay: jest.fn()}));
jest.mock('./get-cash-flows', (): unknown => ({getCashFlows: jest.fn()}));
jest.mock('date-fns', (): unknown => ({differenceInDays: jest.fn(), differenceInMonths: jest.fn(), parseISO: jest.fn()}));

type DifferenceInDays = (laterDate: Date, earlierDate: Date) => number;
type DifferenceInMonths = (laterDate: Date, earlierDate: Date) => number;
type ParseISO = (date: string) => Date;
type YieldInterval = FixedInterestBenchmark['yieldInterval'];

describe('fixedInterestBenchmark', (): void => {
  let benchmark: FixedInterestBenchmark;
  let depotValues: RebasedDepotValue[];
  let differenceInDaysMock: jest.Mock<DifferenceInDays>;
  let differenceInMonthsMock: jest.Mock<DifferenceInMonths>;
  let parseISOMock: jest.Mock<ParseISO>;

  function depotValuesOn(dates: string[]): RebasedDepotValue[] {
    return dates.map((date: string): RebasedDepotValue => rebasedDepotValueFactory({date}));
  }

  beforeEach((): void => {
    differenceInDaysMock = differenceInDays as unknown as jest.Mock<DifferenceInDays>;
    differenceInDaysMock.mockReset();
    differenceInDaysMock.mockImplementation((laterDate: Date, earlierDate: Date): number =>
      Math.round((laterDate.getTime() - earlierDate.getTime()) / 86_400_000));

    // no yield interval passes, so no interest is credited
    differenceInMonthsMock = differenceInMonths as unknown as jest.Mock<DifferenceInMonths>;
    differenceInMonthsMock.mockReset();
    differenceInMonthsMock.mockReturnValue(0);

    parseISOMock = parseISO as unknown as jest.Mock<ParseISO>;
    parseISOMock.mockReset();
    parseISOMock.mockImplementation((date: string): Date => new Date(`${date}T00:00`));

    jest.mocked(installmentsPerDay).mockReset();
    jest.mocked(getCashFlows).mockReset();
  });

  describe('in the interval based mode', (): void => {
    const investmentAmount: number = 100;
    const interestPerYear: number = 3.65;
    const dailyRate: number = interestPerYear / 100 / 365;

    beforeEach((): void => {
      benchmark = {
        type: 'fixedInterest',
        mode: 'intervalBased',
        initialInvestment: undefined,
        depositInterval: 'monthly',
        depositDay: 15,
        investmentPerInterval: investmentAmount,
        interestPerYear,
        daysPerYear: 365,
        yieldInterval: 'annually'
      };
      depotValues = depotValuesOn(['2026-01-15', '2026-01-20', '2026-02-01', '2026-02-16', '2026-02-20']);

      jest.mocked(installmentsPerDay).mockReturnValue([investmentAmount, 0, 0, investmentAmount, 0]);
    });

    it('grows each installment with interest from the day it is deposited', (): void => {
      // 2026-01-15 -> 2026-02-16: 32 days of interest on the first installment alone, the second one deposited fresh
      const balanceAtFeb16: number = 2 * investmentAmount + investmentAmount * dailyRate * 32;

      expect(fixedInterestBenchmark(benchmark, depotValues)).toEqual({
        name: 'Fixed Interest Benchmark',
        values: [
          // on the deposit day itself: 0 days of interest
          investmentAmount,
          // 2026-01-15 -> 2026-01-20: 5 days
          investmentAmount + investmentAmount * dailyRate * 5,
          // 2026-01-15 -> 2026-02-01: 17 days
          investmentAmount + investmentAmount * dailyRate * 17,
          balanceAtFeb16,
          // 2026-02-16 -> 2026-02-20: 4 more days of interest, now on both installments
          balanceAtFeb16 + 2 * investmentAmount * dailyRate * 4
        ]
      });
      expect(jest.mocked(installmentsPerDay).mock.calls).toEqual([[benchmark, depotValues]]);
      expect(getCashFlows).not.toHaveBeenCalled();
      // interest accrues per day since the day before
      expect(differenceInDaysMock.mock.calls).toEqual([
        [new Date(2026, 0, 20), new Date(2026, 0, 15)],
        [new Date(2026, 1, 1), new Date(2026, 0, 20)],
        [new Date(2026, 1, 16), new Date(2026, 1, 1)],
        [new Date(2026, 1, 20), new Date(2026, 1, 16)]
      ]);
      // every day checks the yield interval against the first day, as none passes
      expect(differenceInMonthsMock.mock.calls).toEqual([
        [new Date(2026, 0, 15), new Date(2026, 0, 15)],
        [new Date(2026, 0, 20), new Date(2026, 0, 15)],
        [new Date(2026, 1, 1), new Date(2026, 0, 15)],
        [new Date(2026, 1, 16), new Date(2026, 0, 15)],
        [new Date(2026, 1, 20), new Date(2026, 0, 15)]
      ]);
    });
  });

  describe('in the cashflow based mode', (): void => {
    beforeEach((): void => {
      // 35.15625 % over 360 days is 1 / 1024 per day: a balance of 1024 earns 1 a day
      benchmark = {
        type: 'fixedInterest',
        mode: 'cashFlowBased',
        initialInvestment: 1024,
        interestPerYear: 35.15625,
        daysPerYear: 360,
        yieldInterval: 'monthly'
      };
      depotValues = depotValuesOn(['2026-01-01', '2026-01-03', '2026-01-04', '2026-01-05']);

      jest.mocked(getCashFlows).mockReturnValue([
        {date: '2026-01-01', cashFlow: 0},
        {date: '2026-01-03', cashFlow: 1024}
      ]);
    });

    it('adds each capital increase on its own day and accrues interest on the balance since the day before', (): void => {
      expect(fixedInterestBenchmark(benchmark, depotValues)).toEqual({
        name: 'Fixed Interest Benchmark',
        // 1024 for 2 days, then 2048 for 1 day each
        values: [1024, 2050, 2052, 2054]
      });
      expect(jest.mocked(getCashFlows).mock.calls).toEqual([[depotValues]]);
      expect(installmentsPerDay).not.toHaveBeenCalled();
      expect(differenceInDaysMock.mock.calls).toEqual([
        [new Date(2026, 0, 3), new Date(2026, 0, 1)],
        [new Date(2026, 0, 4), new Date(2026, 0, 3)],
        [new Date(2026, 0, 5), new Date(2026, 0, 4)]
      ]);
    });

    it('counts an empty initial investment as zero', (): void => {
      benchmark = {
        type: 'fixedInterest',
        mode: 'cashFlowBased',
        interestPerYear: 35.15625,
        daysPerYear: 360,
        yieldInterval: 'monthly'
      };

      expect(fixedInterestBenchmark(benchmark, depotValues)).toEqual({
        name: 'Fixed Interest Benchmark',
        // 1024 from 2026-01-03 on
        values: [0, 1024, 1025, 1026]
      });
    });

    it.each([
      ['monthly', 1],
      ['quarterly', 3],
      ['annually', 12]
    ] satisfies [YieldInterval, number][])('credits the accrued interest once a %s yield interval has passed after %i months',
      (yieldInterval: YieldInterval, months: number): void => {
        benchmark = {...benchmark, yieldInterval};
        differenceInMonthsMock
          .mockReturnValueOnce(0)
          .mockReturnValueOnce(0)
          .mockReturnValueOnce(months);

        expect(fixedInterestBenchmark(benchmark, depotValues)).toEqual({
          name: 'Fixed Interest Benchmark',
          // the 4 credited on 2026-01-04 earns interest too: 2052 / 1024 on 2026-01-05
          values: [1024, 2050, 2052, 2054.00390625]
        });
        // the next yield interval counts from the day the interest was credited
        expect(differenceInMonthsMock.mock.calls).toEqual([
          [new Date(2026, 0, 1), new Date(2026, 0, 1)],
          [new Date(2026, 0, 3), new Date(2026, 0, 1)],
          [new Date(2026, 0, 4), new Date(2026, 0, 1)],
          [new Date(2026, 0, 5), new Date(2026, 0, 4)]
        ]);
      });

    it.each([
      ['monthly', 0],
      ['quarterly', 2],
      ['annually', 11]
    ] satisfies [YieldInterval, number][])('credits no interest while a %s yield interval has not passed after %i months',
      (yieldInterval: YieldInterval, months: number): void => {
        benchmark = {...benchmark, yieldInterval};
        differenceInMonthsMock.mockReturnValue(months);

        expect(fixedInterestBenchmark(benchmark, depotValues)).toEqual({
          name: 'Fixed Interest Benchmark',
          values: [1024, 2050, 2052, 2054]
        });
      });

    it('returns no values without depot values', (): void => {
      expect(fixedInterestBenchmark(benchmark, [])).toEqual({
        name: 'Fixed Interest Benchmark',
        values: []
      });
      expect(getCashFlows).not.toHaveBeenCalled();
    });
  });
});
