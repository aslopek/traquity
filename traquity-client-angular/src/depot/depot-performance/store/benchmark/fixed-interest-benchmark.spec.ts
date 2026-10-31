import {describe, expect, it} from '@jest/globals';
import {fixedInterestBenchmark} from './fixed-interest-benchmark';
import {FixedInterestBenchmark} from './benchmark.type';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {rebasedDepotValueFactory} from '../../../../testing/rebased-depot-value.factory';

describe('fixedInterestBenchmark', (): void => {
  const depositDay: number = 15;
  const investmentAmount: number = 100;

  function intervalBenchmark(overrides?: Partial<FixedInterestBenchmark>): FixedInterestBenchmark {
    return {
      type: 'fixedInterest',
      mode: 'intervalBased',
      initialInvestment: undefined,
      depositInterval: 'monthly',
      depositDay,
      investmentPerInterval: investmentAmount,
      interestPerYear: 0,
      daysPerYear: 365,
      yieldInterval: 'monthly',
      ...overrides
    };
  }

  function depotValuesOn(dates: string[]): RebasedDepotValue[] {
    return dates.map((date: string): RebasedDepotValue => rebasedDepotValueFactory({date}));
  }

  it('invests on or after the month\'s due day', (): void => {
    const depotValues: RebasedDepotValue[] = depotValuesOn(['2026-01-20', '2026-01-21', '2026-02-15', '2026-02-16']);

    const result = fixedInterestBenchmark(intervalBenchmark(), depotValues);

    expect(result.values).toEqual([
      investmentAmount,
      investmentAmount,
      2 * investmentAmount,
      2 * investmentAmount
    ]);
  });

  it('invests a missed deposit day on the next shown day', (): void => {
    const depotValues: RebasedDepotValue[] = depotValuesOn(['2026-01-13', '2026-01-14', '2026-01-16', '2026-01-17']);

    const result = fixedInterestBenchmark(intervalBenchmark(), depotValues);

    expect(result.values).toEqual([
      0,
      0,
      investmentAmount,
      investmentAmount
    ]);
  });

  it('carries a missed deposit day forward into the next month', (): void => {
    const depotValues: RebasedDepotValue[] = depotValuesOn(['2026-01-13', '2026-01-14', '2026-02-10', '2026-02-14', '2026-02-15']);

    const result = fixedInterestBenchmark(intervalBenchmark(), depotValues);

    expect(result.values).toEqual([
      0,
      0,
      investmentAmount,
      investmentAmount,
      2 * investmentAmount
    ]);
  });

  it('adds up two installments landing on the same day', (): void => {
    const depotValues: RebasedDepotValue[] = depotValuesOn(['2026-01-13', '2026-01-14', '2026-02-16']);

    const result = fixedInterestBenchmark(intervalBenchmark(), depotValues);

    expect(result.values).toEqual([
      0,
      0,
      2 * investmentAmount
    ]);
  });

  it('credits a month\'s total cash flow to its installment, even cash flow landing after the due day', (): void => {
    const monthlyIncrease: number = 50;
    const depotValues: RebasedDepotValue[] = [
      rebasedDepotValueFactory({date: '2026-01-15', investedCapital: 0}),
      rebasedDepotValueFactory({date: '2026-01-20', investedCapital: monthlyIncrease}),
      rebasedDepotValueFactory({date: '2026-02-15', investedCapital: monthlyIncrease})
    ];

    const result = fixedInterestBenchmark(intervalBenchmark({investmentPerInterval: 'reinvestCashFlow'}), depotValues);

    expect(result.values).toEqual([
      monthlyIncrease,
      monthlyIncrease,
      monthlyIncrease]);
  });

  it('grows each installment with interest from its own deposit day, not the month\'s due day', (): void => {
    const interestPerYear: number = 3.65;
    const dailyRate: number = interestPerYear / 100 / 365;
    const depositDate: string = '2026-01-15';
    const depotValues: RebasedDepotValue[]
      = depotValuesOn([depositDate, '2026-01-20', '2026-02-01', '2026-02-16', '2026-02-20']);

    const result = fixedInterestBenchmark(
      intervalBenchmark({interestPerYear, daysPerYear: 365, yieldInterval: 'annually'}),
      depotValues
    );
    if (Array.isArray(result)) {
      throw new Error('fixedInterestBenchmark in intervalBased mode returns a single BenchmarkResult, not a tuple');
    }

    expect(result.values[0]).toEqual(investmentAmount); // on the deposit day itself: 0 days of interest
    expect(result.values[1]).toEqual(investmentAmount + investmentAmount * dailyRate * 5); // 2026-01-15 -> 2026-01-20: 5 days
    expect(result.values[2]).toEqual(investmentAmount + investmentAmount * dailyRate * 17); // 2026-01-15 -> 2026-02-01: 17 days

    const balanceAtFeb16: number = 2 * investmentAmount + investmentAmount * dailyRate * 32; // 2026-01-15 -> 2026-02-16: 32 days of
    // interest on the first installment alone, plus the second installment depositing fresh with 0 days of its own interest yet
    expect(result.values[3]).toEqual(balanceAtFeb16);
    // 2026-02-16 -> 2026-02-20: 4 more days of interest, now on both installments combined
    expect(result.values[4]).toEqual(balanceAtFeb16 + 2 * investmentAmount * dailyRate * 4);
  });
});
