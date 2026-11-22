import {BenchmarkResult, SecurityCashFlowBasedBenchmark} from './benchmark.type';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {getCashFlows} from './get-cash-flows';
import {HistoricalSecurityPrice} from '../../../../gen/api/historical-security-price';
import {SecurityNamePipe} from '../../../../common/pipe/security-name.pipe';
import {pricesPerDay} from './prices-per-day';
import {buyAndHold} from './buy-and-hold';
import {fillPriceGaps} from './fill-price-gaps';

/**
 * Values the depot's own money as if it had been invested solely into one security. The initial investment buys shares on the first depot
 * value's day, every later increase of the invested capital buys shares on the day it happens. Each day is valued at the latest price on or
 * before it.
 *
 * A day priced `0` before the last day priced above `0` takes the price of the latest day before it priced above `0`. Without such a day,
 * its money buys on the first day priced above `0` and counts as money until then. After the last day priced above `0`, the shares are
 * worth `0`, and the money due is never invested and counts as money.
 *
 * @param benchmark the security and the initial investment; an absent initial investment counts as `0`
 * @param depotValues the days to value, ascending by date
 * @param prices the security's prices in the depot currency, ascending by date
 * @param securityNamePipe names the series
 * @returns the series named after the security, one value per depot value; `null` if `prices` holds none on or before the first depot
 * value's day
 */
export function securityCashFlowBasedBenchmark(benchmark: SecurityCashFlowBasedBenchmark,
                                               depotValues: RebasedDepotValue[],
                                               prices: HistoricalSecurityPrice[],
                                               securityNamePipe: SecurityNamePipe): BenchmarkResult | null {
  const rawDayPrices: number[] | null = pricesPerDay(depotValues, prices);
  if (rawDayPrices === null) {
    return null;
  }

  const dayPrices: number[] = fillPriceGaps(rawDayPrices);
  const cashFlowByDate: Map<string, number> = new Map<string, number>();
  for (const cashFlow of getCashFlows(depotValues)) {
    cashFlowByDate.set(cashFlow.date, cashFlow.cashFlow);
  }

  const moneyPerDay: number[] = depotValues.map((depotValue: RebasedDepotValue): number => cashFlowByDate.get(depotValue.date) ?? 0);
  moneyPerDay[0] += benchmark.initialInvestment ?? 0;

  return {
    name: securityNamePipe.transform(benchmark.securityId),
    values: buyAndHold(moneyPerDay, dayPrices)
  };
}
