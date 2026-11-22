import {BenchmarkResult, SecurityIntervalBasedBenchmark} from './benchmark.type';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {HistoricalSecurityPrice} from '../../../../gen/api/historical-security-price';
import {SecurityNamePipe} from '../../../../common/pipe/security-name.pipe';
import {pricesPerDay} from './prices-per-day';
import {installmentsPerDay} from './installments-per-day';
import {buyAndHold} from './buy-and-hold';
import {fillPriceGaps} from './fill-price-gaps';

/**
 * Values a monthly savings plan in one security. Each installment of the savings plan buys shares on the day it is deposited, the initial
 * investment on the first depot value's day, on top of that day's installment. Each day is valued at the latest price on or before it.
 *
 * A day priced `0` before the last day priced above `0` takes the price of the latest day before it priced above `0`. Without such a day,
 * its money buys on the first day priced above `0` and counts as money until then. After the last day priced above `0`, the shares are
 * worth `0`, and the money due is never invested and counts as money.
 *
 * @param benchmark the security, the savings plan and the initial investment; an absent initial investment counts as `0`
 * @param depotValues the days to value, ascending by date
 * @param prices the security's prices in the depot currency, ascending by date
 * @param securityNamePipe names the series
 * @returns the series named after the security, one value per depot value; `null` if `prices` holds none on or before the first depot
 * value's day
 */
export function securityIntervalBasedBenchmark(benchmark: SecurityIntervalBasedBenchmark,
                                               depotValues: RebasedDepotValue[],
                                               prices: HistoricalSecurityPrice[],
                                               securityNamePipe: SecurityNamePipe): BenchmarkResult | null {
  const rawDayPrices: number[] | null = pricesPerDay(depotValues, prices);
  if (rawDayPrices === null) {
    return null;
  }

  const dayPrices: number[] = fillPriceGaps(rawDayPrices);
  const moneyPerDay: number[] = [...installmentsPerDay(benchmark, depotValues)];
  moneyPerDay[0] += benchmark.initialInvestment ?? 0;

  return {
    name: securityNamePipe.transform(benchmark.securityId),
    values: buyAndHold(moneyPerDay, dayPrices)
  };
}
