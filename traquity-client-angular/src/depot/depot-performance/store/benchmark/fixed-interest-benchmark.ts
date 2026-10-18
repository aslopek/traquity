import {BenchmarkFunction, BenchmarkResult, FixedInterestBenchmark} from './benchmark.type';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {CashFlow, getCashFlows} from './get-cash-flows';
import {addMonths, differenceInDays, differenceInMonths, getDate, getMonth, getYear, parseISO} from 'date-fns';

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
    let date: Date;
    let key: string;
    for (const cashFlow of cashFlows) {
      date = parseISO(cashFlow.date);
      key = `${getYear(date)}-${getMonth(date)}`;
      monthlyCashFlowMap.set(key, (monthlyCashFlowMap.get(key) ?? 0) + cashFlow.cashFlow);
    }
  }

  const executedDeposits: Set<string> = new Set<string>();
  const dailyRate: number = (benchmark.interestPerYear / 100) / benchmark.daysPerYear;
  let currentBalance: number = benchmark.initialInvestment ?? 0;
  let accruedInterest: number = 0;
  let lastYieldIntervalDate: string = depotValues[0].date;
  let depositAmount: number;
  let previousDate: Date;
  let currentDate: Date;
  let diffDays: number;
  let currentItem: RebasedDepotValue;
  let currentDay: number;
  let currentMonth: number;
  let currentYear: number;
  let currentKey: string;
  let prevMonthDate: Date;
  let prevMonthKey: string;
  let hasMissedPrevMonth: boolean
  let tempDate: Date;
  let skippedKey: string;
  let targetKey: string;

  for (let i = 0; i < depotValues.length; i++) {
    currentItem = depotValues[i];
    currentDate = parseISO(currentItem.date);
    currentDay = getDate(currentDate);
    currentMonth = getMonth(currentDate);
    currentKey = `${getYear(currentDate)}-${currentMonth}`;

    // calculate interest on current balance
    if (i > 0) {
      previousDate = parseISO(depotValues[i - 1].date);
      diffDays = differenceInDays(currentDate, previousDate);
      accruedInterest += currentBalance * dailyRate * diffDays;

      currentYear = getYear(currentDate);
      tempDate = addMonths(previousDate, 1);

      // loop through all months but the current month
      while (getYear(tempDate) * 12 + getMonth(tempDate) < currentYear * 12 + currentMonth) {
        skippedKey = `${getYear(tempDate)}-${getMonth(tempDate)}`;

        if (!executedDeposits.has(skippedKey)) {
          if (benchmark.investmentPerInterval === 'reinvestCashFlow') {
            currentBalance += monthlyCashFlowMap.get(skippedKey) ?? 0;
          } else {
            currentBalance += benchmark.investmentPerInterval;
          }
          executedDeposits.add(skippedKey);
        }
        tempDate = addMonths(tempDate, 1);
      }
    }

    // regular investment & catch-up for previous month if it was missed due to holidays/weekends
    prevMonthDate = addMonths(currentDate, -1);
    prevMonthKey = `${getYear(prevMonthDate)}-${getMonth(prevMonthDate)}`;
    hasMissedPrevMonth = i > 0 && !executedDeposits.has(prevMonthKey);

    if (hasMissedPrevMonth || (currentDay >= benchmark.depositDay && !executedDeposits.has(currentKey))) {
      targetKey = hasMissedPrevMonth ? prevMonthKey : currentKey;
      depositAmount = 0;

      if (benchmark.investmentPerInterval === 'reinvestCashFlow') {
        depositAmount = monthlyCashFlowMap.get(targetKey) ?? 0;
      } else {
        depositAmount = benchmark.investmentPerInterval;
      }

      currentBalance += depositAmount;
      executedDeposits.add(targetKey);

      // If we just caught up the previous month, re-evaluate the current month in the next iteration or right away
      if (hasMissedPrevMonth && currentDay >= benchmark.depositDay && !executedDeposits.has(currentKey)) {
        depositAmount = benchmark.investmentPerInterval === 'reinvestCashFlow'
          ? (monthlyCashFlowMap.get(currentKey) ?? 0)
          : benchmark.investmentPerInterval;
        currentBalance += depositAmount;
        executedDeposits.add(currentKey);
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
