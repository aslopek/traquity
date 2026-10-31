import {BenchmarkFunction, BenchmarkResult, FixedInterestBenchmark} from './benchmark.type';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {CashFlow, getCashFlows} from './get-cash-flows';
import {addMonths, differenceInDays, differenceInMonths, format, getMonth, getYear, parseISO, setDate, startOfMonth} from 'date-fns';

export const fixedInterestBenchmark: BenchmarkFunction<FixedInterestBenchmark>
  = (benchmark: FixedInterestBenchmark, depotValues: RebasedDepotValue[]): BenchmarkResult => {
  if (benchmark.mode === 'cashFlowBased') {
    return cashFlowBasedBenchmark(benchmark, depotValues);
  }
  return intervalBasedBenchmark(benchmark, depotValues);
}

function cashFlowBasedBenchmark(benchmark: FixedInterestBenchmark, depotValues: RebasedDepotValue[]): BenchmarkResult {
  const result: BenchmarkResult = {
    name: 'Fixed Interest Benchmark',
    values: []
  }
  if (depotValues.length === 0 || benchmark.mode !== 'cashFlowBased') {
    return result;
  }

  const cashFlows: CashFlow[] = getCashFlows(depotValues);
  const cashFlowMap: Map<string, number> = new Map<string, number>();
  for (const cashFlow of cashFlows) {
    cashFlowMap.set(cashFlow.date, cashFlow.cashFlow)
  }

  const dailyRate: number = (benchmark.interestPerYear / 100) / benchmark.daysPerYear;
  let currentBalance: number = benchmark.initialInvestment ?? 0;
  let accruedInterest: number = 0;
  let lastYieldIntervalDate: string = depotValues[0].date;
  let previousDate: Date;
  let currentDate: Date;
  let diffDays: number;
  let currentItem: RebasedDepotValue;

  for (let i = 0; i < depotValues.length; i++) {
    currentItem = depotValues[i];

    // calculate interest on current balance
    if (i > 0) {
      previousDate = parseISO(depotValues[i - 1].date);
      currentDate = parseISO(currentItem.date);
      diffDays = differenceInDays(currentDate, previousDate);
      accruedInterest += currentBalance * dailyRate * diffDays;
    }

    // add cash flow to balance, if it exists
    currentBalance += cashFlowMap.get(currentItem.date) ?? 0;

    // check if interest has to be credited to the balance
    if (isIntervalPassed(lastYieldIntervalDate, currentItem.date, benchmark.yieldInterval)) {
      currentBalance += accruedInterest;
      accruedInterest = 0;
      lastYieldIntervalDate = currentItem.date;
    }

    // add current NAV to benchmark
    result.values.push(currentBalance + accruedInterest);
  }

  return result;
}

function intervalBasedBenchmark(benchmark: FixedInterestBenchmark, depotValues: RebasedDepotValue[]): BenchmarkResult {
  const result: BenchmarkResult = {
    name: 'Fixed Interest Benchmark',
    values: []
  };
  if (depotValues.length === 0 || benchmark.mode !== 'intervalBased') {
    return result;
  }

  const monthlyCashFlowMap: Map<string, number> = new Map<string, number>();
  if (benchmark.investmentPerInterval === 'reinvestCashFlow') {
    const cashFlows: CashFlow[] = getCashFlows(depotValues);
    let key: string;
    for (const cashFlow of cashFlows) {
      key = monthKey(parseISO(cashFlow.date));
      monthlyCashFlowMap.set(key, (monthlyCashFlowMap.get(key) ?? 0) + cashFlow.cashFlow);
    }
  }

  const depositSchedule: Map<number, string[]> = scheduleDeposits(depotValues, benchmark.depositDay);
  const dailyRate: number = (benchmark.interestPerYear / 100) / benchmark.daysPerYear;
  let currentBalance: number = benchmark.initialInvestment ?? 0;
  let accruedInterest: number = 0;
  let lastYieldIntervalDate: string = depotValues[0].date;
  let previousDate: Date;
  let currentDate: Date;
  let diffDays: number;
  let currentItem: RebasedDepotValue;
  let dueMonthKeys: string[] | undefined;
  let depositAmount: number;

  for (let i = 0; i < depotValues.length; i++) {
    currentItem = depotValues[i];
    currentDate = parseISO(currentItem.date);

    // calculate interest on current balance
    if (i > 0) {
      previousDate = parseISO(depotValues[i - 1].date);
      diffDays = differenceInDays(currentDate, previousDate);
      accruedInterest += currentBalance * dailyRate * diffDays;
    }

    // deposit every installment scheduled for this day
    dueMonthKeys = depositSchedule.get(i);
    if (dueMonthKeys) {
      for (const key of dueMonthKeys) {
        depositAmount = benchmark.investmentPerInterval === 'reinvestCashFlow'
          ? (monthlyCashFlowMap.get(key) ?? 0)
          : benchmark.investmentPerInterval;
        currentBalance += depositAmount;
      }
    }

    // check if interest has to be credited to the balance
    if (isIntervalPassed(lastYieldIntervalDate, currentItem.date, benchmark.yieldInterval)) {
      currentBalance += accruedInterest;
      accruedInterest = 0;
      lastYieldIntervalDate = currentItem.date;
    }

    // add current NAV to benchmark
    result.values.push(currentBalance + accruedInterest);
  }

  return result;
}

function monthKey(date: Date): string {
  return `${getYear(date)}-${getMonth(date)}`;
}

/**
 * Every calendar month from the first to the last depot value's month gets exactly one entry, on the first depot value whose
 * date is on or after that month's deposit day. A month gets no entry once the series ends before its deposit day. A
 * deposit day already passed by the first depot value lands on that first depot value, same as any other overdue one.
 *
 * This means: for n >= 0 months between the first and last depotValues entry, m of those months end up scheduled. m can
 * land on fewer than m depot-value indices, since two months scheduled on the same depot value share one index:
 * <ul>
 *   <li>m = 0: if n = 0 AND deposit day not yet reached</li>
 *   <li>m = 1: if n = 0 AND deposit day reached</li>
 *   <li>m = n: if n >= 1 AND deposit day in the last month not yet reached</li>
 *   <li>m = n + 1: if n >= 1 AND deposit day in the last month reached</li>
 * </ul>
 *
 * @param depotValues the series to schedule installments against, ascending by date
 * @param depositDay the day of the month, 1-28, an installment is due on
 * @returns a map from each depot-value index a deposit lands on to the month keys (see `monthKey`) deposited there, each a
 * `yyyy-M` string identifying the calendar month the installment is for, M zero-indexed (January = 0)
 */
function scheduleDeposits(depotValues: RebasedDepotValue[], depositDay: number): Map<number, string[]> {
  const schedule: Map<number, string[]> = new Map<number, string[]>();
  if (depotValues.length === 0) {
    return schedule;
  }

  const lastMonth: Date = startOfMonth(parseISO(depotValues[depotValues.length - 1].date));
  let month: Date = startOfMonth(parseISO(depotValues[0].date));
  let depotIndex: number = 0;
  let dueDate: string;

  while (month.getTime() <= lastMonth.getTime()) {
    dueDate = format(setDate(month, depositDay), 'yyyy-MM-dd');

    while (depotIndex < depotValues.length && depotValues[depotIndex].date < dueDate) {
      depotIndex++;
    }

    if (depotIndex < depotValues.length) {
      schedule.set(depotIndex, [...(schedule.get(depotIndex) ?? []), monthKey(month)]);
    }

    month = addMonths(month, 1);
  }

  return schedule;
}

function isIntervalPassed(
  lastDateStr: string,
  currentDateStr: string,
  interval: 'monthly' | 'quarterly' | 'annually'
): boolean {
  const lastDate: Date = parseISO(lastDateStr);
  const currentDate: Date = parseISO(currentDateStr);
  const monthDiff: number = differenceInMonths(currentDate, lastDate);

  switch (interval) {
    case 'monthly':
      return monthDiff >= 1;
    case 'quarterly':
      return monthDiff >= 3;
    case 'annually':
      return monthDiff >= 12;
    default:
      return false;
  }
}
