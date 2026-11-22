import {BenchmarkResult, SecurityCashFlowBasedBenchmark} from './benchmark.type';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {getCashFlows} from './get-cash-flows';
import {HistoricalSecurityPrice} from '../../../../gen/api/historical-security-price';
import {SecurityNamePipe} from '../../../../common/pipe/security-name.pipe';
import {pricesPerDay} from './prices-per-day';

/**
 * Values the depot's own money as if it had been invested solely into one security. The initial investment buys shares on the first depot
 * value's day, every later increase of the invested capital buys shares on the day it happens. Money due on a day priced `0` buys on the
 * next day priced above `0`. Each day is valued at the latest price on or before it.
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
  const dayPrices: number[] | null = pricesPerDay(depotValues, prices);
  if (dayPrices === null) {
    return null;
  }

  const cashFlowByDate: Map<string, number> = new Map<string, number>();
  for (const cashFlow of getCashFlows(depotValues)) {
    cashFlowByDate.set(cashFlow.date, cashFlow.cashFlow);
  }

  const values: number[] = [];
  let price: number;
  let shares: number = 0;
  let uninvested: number = benchmark.initialInvestment ?? 0;

  for (const [day, depotValue] of depotValues.entries()) {
    price = dayPrices[day];
    uninvested += cashFlowByDate.get(depotValue.date) ?? 0;

    if (price > 0) {
      shares += uninvested / price;
      uninvested = 0;
    }
    values.push(shares * price);
  }

  return {
    name: securityNamePipe.transform(benchmark.securityId),
    values
  };
}
