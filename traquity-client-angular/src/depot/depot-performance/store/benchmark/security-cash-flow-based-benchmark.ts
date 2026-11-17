import {BenchmarkResult, SecurityBenchmark, SecurityCashFlowBasedBenchmark} from './benchmark.type';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {getCashFlows} from './get-cash-flows';
import {HistoricalSecurityPrice} from '../../../../gen/api/historical-security-price';
import {SecurityNamePipe} from '../../../../common/pipe/security-name.pipe';

/**
 * Values the depot's own money as if it had been invested solely into one security. The initial investment buys shares on the
 * first depot value's day, every later increase of the invested capital buys shares on the day it happens. Each day is valued
 * at the latest price on or before it.
 *
 * @param benchmark the security and the initial investment; an absent initial investment counts as `0`
 * @param depotValues the shown days, ascending by date
 * @param prices the security's prices in the depot currency, ascending by date
 * @param securityNamePipe names the series
 * @returns the series named after the security, one value per depot value; `null` if `prices` holds none on or before the first
 * depot value's day
 */
export function securityBenchmark(benchmark: SecurityCashFlowBasedBenchmark, depotValues: RebasedDepotValue[], prices: HistoricalSecurityPrice[],
                                  securityNamePipe: SecurityNamePipe): BenchmarkResult | null {
  if (depotValues.length === 0 || prices.length === 0 || prices[0].date > depotValues[0].date) {
    return null;
  }

  const cashFlowByDate: Map<string, number> = new Map<string, number>();
  for (const cashFlow of getCashFlows(depotValues)) {
    cashFlowByDate.set(cashFlow.date, cashFlow.cashFlow);
  }

  const values: number[] = [];
  let priceIndex: number = 0;
  let price: number;
  let shares: number = 0;

  for (const [day, depotValue] of depotValues.entries()) {
    while (priceIndex + 1 < prices.length && prices[priceIndex + 1].date <= depotValue.date) {
      priceIndex++;
    }
    price = prices[priceIndex].price;

    if (day === 0) {
      shares = (benchmark.initialInvestment ?? 0) / price;
    }
    shares += (cashFlowByDate.get(depotValue.date) ?? 0) / price;
    values.push(shares * price);
  }

  return {
    name: securityNamePipe.transform(benchmark.securityId),
    values
  };
}
