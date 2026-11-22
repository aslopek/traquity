import {getYear, parseISO} from 'date-fns';
import {BenchmarkResult, SecurityLuckyInvestorBenchmark} from './benchmark.type';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {HistoricalSecurityPrice} from '../../../../gen/api/historical-security-price';
import {SecurityNamePipe} from '../../../../common/pipe/security-name.pipe';
import {getCashFlows} from './get-cash-flows';
import {pricesPerDay} from './prices-per-day';
import {buyAndHold} from './buy-and-hold';
import {fillPriceGaps} from './fill-price-gaps';

/**
 * Values the depot's own money as if each calendar year's money had been invested into one security in one go: by a lucky investor on the
 * year's cheapest day, and by an unlucky one on the year's most expensive day. A year's money is what the invested capital grew by during
 * that year. The first year's money also includes the initial investment.
 *
 * Of several days sharing the lowest price, the lucky investor buys on the latest. Of several days sharing the highest price, the unlucky
 * investor buys on the earliest. Neither buys on a day priced `0`. Each day is valued at the latest price on or before it. A day priced `0`
 * before the last day priced above `0` takes the price of the latest day before it priced above `0`, for buying and valuing alike.
 *
 * After the last day priced above `0`, the shares are worth `0`. A year that starts after it buys nothing: both series keep its money as
 * money from the year's first day on. Any other year without a price above `0` buys nothing and its money is dropped.
 *
 * During years without an increase of the invested capital, the benchmark buys no additional shares.
 *
 * Between a year's two purchases, the unlucky series can be above the lucky one if the unlucky purchase comes first.
 *
 * @param benchmark the security and the initial investment; an absent initial investment counts as `0`
 * @param depotValues the days to value, ascending by date
 * @param prices the security's prices in the depot currency, ascending by date
 * @param securityNamePipe for determining the benchmarked security's name
 * @returns the lucky and the unlucky series, in that order, each with one value per depot value and `0` before its first purchase or kept
 * money; `null` if `prices` holds none on or before the first depot value's day
 */
export function securityLuckyInvestorBenchmark(benchmark: SecurityLuckyInvestorBenchmark,
                                               depotValues: RebasedDepotValue[],
                                               prices: HistoricalSecurityPrice[],
                                               securityNamePipe: SecurityNamePipe): [BenchmarkResult, BenchmarkResult] | null {
  const rawDayPrices: number[] | null = pricesPerDay(depotValues, prices);
  if (rawDayPrices === null) {
    return null;
  }

  const dayPrices: number[] = fillPriceGaps(rawDayPrices);
  const daysByYear: Map<number, number[]> = daysPerYear(depotValues);
  const moneyByYear: Map<number, number> = moneyPerYear(depotValues, benchmark.initialInvestment ?? 0);

  const luckyMoneyPerDay: number[] = dayPrices.map((): number => 0);
  const unluckyMoneyPerDay: number[] = dayPrices.map((): number => 0);
  const lastBuyableDay: number = lastPricedDay(dayPrices);
  let buyableDays: number[];
  let money: number;

  for (const [year, days] of daysByYear) {
    buyableDays = days.filter((day: number): boolean => dayPrices[day] > 0);
    money = moneyByYear.get(year) ?? 0;
    if (buyableDays.length > 0) {
      luckyMoneyPerDay[cheapestDay(buyableDays, dayPrices)] = money;
      unluckyMoneyPerDay[mostExpensiveDay(buyableDays, dayPrices)] = money;
    } else if (days[0] > lastBuyableDay) {
      // every later day is priced 0 too, so buyAndHold keeps this money uninvested for good
      luckyMoneyPerDay[days[0]] = money;
      unluckyMoneyPerDay[days[0]] = money;
    }
  }

  const securityName: string = securityNamePipe.transform(benchmark.securityId);

  return [
    {
      name: `${securityName} (lucky)`,
      values: buyAndHold(luckyMoneyPerDay, dayPrices)
    },
    {
      name: `${securityName} (unlucky)`,
      values: buyAndHold(unluckyMoneyPerDay, dayPrices)
    }
  ];
}

/**
 * Finds the last day priced above `0`.
 *
 * @param dayPrices the price per day
 * @returns the index of the last price above `0`; `-1` if there is none
 */
function lastPricedDay(dayPrices: number[]): number {
  let lastPriced: number = -1;
  for (const [day, price] of dayPrices.entries()) {
    if (price > 0) {
      lastPriced = day;
    }
  }
  return lastPriced;
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
