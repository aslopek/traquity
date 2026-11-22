import {addMonths, format, getMonth, getYear, parseISO, setDate, startOfMonth} from 'date-fns';
import {IntervalBasedBenchmark} from './benchmark.type';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {getCashFlows} from './get-cash-flows';

/**
 * Lays a monthly savings plan onto the days of the depot values. Each calendar month from the first to the last day's month is invested
 * once, on the first day on or after its deposit day. A month whose deposit day the first day has already passed is invested on the first
 * day. A month ending the series before its deposit day is not invested. Installments of several months landing on one day add up.
 *
 * @param savingsPlan the deposit day and the amount per month; `'reinvestCashFlow'` invests what the invested capital grew by during that
 * month
 * @param depotValues the days to invest on, ascending by date
 * @returns the money invested on each day, in the order of `depotValues`; `0` on a day without an installment
 */
export function installmentsPerDay(savingsPlan: Pick<IntervalBasedBenchmark, 'depositDay' | 'investmentPerInterval'>,
                                   depotValues: RebasedDepotValue[]): number[] {
  const cashFlowByMonth: Map<string, number> = savingsPlan.investmentPerInterval === 'reinvestCashFlow'
    ? cashFlowPerMonth(depotValues)
    : new Map<string, number>();
  const installments: number[] = depotValues.map((): number => 0);

  for (const [day, monthKeys] of scheduleDeposits(depotValues, savingsPlan.depositDay)) {
    for (const key of monthKeys) {
      installments[day] += savingsPlan.investmentPerInterval === 'reinvestCashFlow'
        ? (cashFlowByMonth.get(key) ?? 0)
        : savingsPlan.investmentPerInterval;
    }
  }

  return installments;
}

function monthKey(date: Date): string {
  return `${getYear(date)}-${getMonth(date)}`;
}

/**
 * Sums the increases of the invested capital per calendar month.
 *
 * @param depotValues the days and their invested capital, ascending by date
 * @returns the increases per month key (see `monthKey`); a month without any increase may be missing
 */
function cashFlowPerMonth(depotValues: RebasedDepotValue[]): Map<string, number> {
  const cashFlowByMonth: Map<string, number> = new Map<string, number>();
  let key: string;

  for (const cashFlow of getCashFlows(depotValues)) {
    key = monthKey(parseISO(cashFlow.date));
    cashFlowByMonth.set(key, (cashFlowByMonth.get(key) ?? 0) + cashFlow.cashFlow);
  }

  return cashFlowByMonth;
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
