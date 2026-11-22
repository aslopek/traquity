import {BenchmarkFunction, BenchmarkResult, FixedInterestBenchmark} from './benchmark.type';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {CashFlow, getCashFlows} from './get-cash-flows';
import {differenceInDays, differenceInMonths, parseISO} from 'date-fns';
import {installmentsPerDay} from './installments-per-day';

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

  const installments: number[] = installmentsPerDay(benchmark, depotValues);
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
    currentDate = parseISO(currentItem.date);

    // calculate interest on current balance
    if (i > 0) {
      previousDate = parseISO(depotValues[i - 1].date);
      diffDays = differenceInDays(currentDate, previousDate);
      accruedInterest += currentBalance * dailyRate * diffDays;
    }

    // deposit every installment scheduled for this day
    currentBalance += installments[i];

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
