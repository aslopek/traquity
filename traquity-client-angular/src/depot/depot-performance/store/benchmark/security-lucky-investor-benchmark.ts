import {getYear, parseISO} from 'date-fns';
import {BenchmarkResult, SecurityLuckyInvestorBenchmark} from './benchmark.type';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {HistoricalSecurityPrice} from '../../../../gen/api/historical-security-price';
import {SecurityNamePipe} from '../../../../common/pipe/security-name.pipe';
import {getCashFlows} from './get-cash-flows';
import {pricesPerDay} from './prices-per-day';

/**
 * Values the depot's own money as if each calendar year's money had been invested into one security in one go: by a lucky investor on the
 * year's cheapest day, and by an unlucky one on the year's most expensive day. A year's money is what the invested capital grew by during
 * that year. The first year's money also includes the initial investment.
 *
 * Of several days sharing the lowest price, the lucky investor buys on the latest. Of several days sharing the highest price, the unlucky
 * investor buys on the earliest. Neither buys on a day priced `0`, so a year without a price above `0` buys nothing. Each day is valued at
 * the latest price on or before it.
 *
 * During years without an increase of the invested capital, the benchmark buys no additional shares.
 *
 * Between a year's two purchases, the unlucky series can be above the lucky one if the unlucky purchase comes first.
 *
 * @param benchmark the security and the initial investment; an absent initial investment counts as `0`
 * @param depotValues the days to value, ascending by date
 * @param prices the security's prices in the depot currency, ascending by date
 * @param securityNamePipe for determining the benchmarked security's name
 * @returns the lucky and the unlucky series, in that order, each with one value per depot value and `0` before its first purchase; `null`
 * if `prices` holds none on or before the first depot value's day
 */
export function securityLuckyInvestorBenchmark(benchmark: SecurityLuckyInvestorBenchmark,
                                               depotValues: RebasedDepotValue[],
                                               prices: HistoricalSecurityPrice[],
                                               securityNamePipe: SecurityNamePipe): [BenchmarkResult, BenchmarkResult] | null {
  const dayPrices: number[] | null = pricesPerDay(depotValues, prices);
  if (dayPrices === null) {
    return null;
  }

  const daysByYear: Map<number, number[]> = daysPerYear(depotValues);
  const moneyByYear: Map<number, number> = moneyPerYear(depotValues, benchmark.initialInvestment ?? 0);

  const luckyPurchases: Map<number, number> = new Map<number, number>();
  const unluckyPurchases: Map<number, number> = new Map<number, number>();
  let buyableDays: number[];
  let money: number;

  for (const [year, days] of daysByYear) {
    buyableDays = days.filter((day: number): boolean => dayPrices[day] > 0);
    if (buyableDays.length > 0) {
      money = moneyByYear.get(year) ?? 0;
      luckyPurchases.set(cheapestDay(buyableDays, dayPrices), money);
      unluckyPurchases.set(mostExpensiveDay(buyableDays, dayPrices), money);
    }
  }

  const securityName: string = securityNamePipe.transform(benchmark.securityId);

  return [
    {
      name: `${securityName} (lucky)`,
      values: valuesOf(luckyPurchases, dayPrices)
    },
    {
      name: `${securityName} (unlucky)`,
      values: valuesOf(unluckyPurchases, dayPrices)
    }
  ];
}

function yearOf(date: string): number {
  return getYear(parseISO(date));
}

/**
 * Groups the days of the depot values by calendar year.
 *
 * @param depotValues the days to group, ascending by date
 * @returns the indices into `depotValues` per calendar year, each list ascending
 */
function daysPerYear(depotValues: RebasedDepotValue[]): Map<number, number[]> {
  const daysByYear: Map<number, number[]> = new Map<number, number[]>();
  let days: number[];
  let year: number;

  for (const [day, depotValue] of depotValues.entries()) {
    year = yearOf(depotValue.date);
    days = daysByYear.get(year) ?? [];
    days.push(day);
    daysByYear.set(year, days);
  }

  return daysByYear;
}

/**
 * Sums the money each calendar year has to invest: the increases of the invested capital during that year, and the initial investment for
 * the year of the first day.
 *
 * @param depotValues the days and their invested capital, ascending by date; at least one
 * @param initialInvestment the money added to the year of the first day
 * @returns the money per calendar year; a year without any money may be missing
 */
function moneyPerYear(depotValues: RebasedDepotValue[], initialInvestment: number): Map<number, number> {
  const moneyByYear: Map<number, number> = new Map<number, number>([[yearOf(depotValues[0].date), initialInvestment]]);
  let year: number;

  for (const cashFlow of getCashFlows(depotValues)) {
    year = yearOf(cashFlow.date);
    moneyByYear.set(year, (moneyByYear.get(year) ?? 0) + cashFlow.cashFlow);
  }

  return moneyByYear;
}

/**
 * Picks the day with the lowest price.
 *
 * @param days indices into `dayPrices`, ascending; at least one
 * @param dayPrices the price per day
 * @returns the latest of the days with the lowest price
 */
function cheapestDay(days: number[], dayPrices: number[]): number {
  let cheapest: number = days[0];

  for (const day of days) {
    // `<=` breaks a tie: a later day with the same lowest price replaces an earlier one
    if (dayPrices[day] <= dayPrices[cheapest]) {
      cheapest = day;
    }
  }

  return cheapest;
}

/**
 * Picks the day with the highest price.
 *
 * @param days indices into `dayPrices`, ascending; at least one
 * @param dayPrices the price per day
 * @returns the earliest of the days with the highest price
 */
function mostExpensiveDay(days: number[], dayPrices: number[]): number {
  let mostExpensive: number = days[0];

  for (const day of days) {
    // `>` breaks a tie: a later day with the same highest price does not replace an earlier one
    if (dayPrices[day] > dayPrices[mostExpensive]) {
      mostExpensive = day;
    }
  }

  return mostExpensive;
}

/**
 * Values the shares bought by the given purchases on each day.
 *
 * @param purchases the money invested per day, keyed by index into `dayPrices`; each such day priced above `0`
 * @param dayPrices the price per day
 * @returns per day, the value of all shares bought up to and including that day, at that day's price
 */
function valuesOf(purchases: Map<number, number>, dayPrices: number[]): number[] {
  const values: number[] = [];
  let shares: number = 0;
  let money: number | undefined;

  for (const [day, price] of dayPrices.entries()) {
    money = purchases.get(day);
    if (money !== undefined) {
      shares += money / price;
    }
    values.push(shares * price);
  }

  return values;
}
