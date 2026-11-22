import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {HistoricalSecurityPrice} from '../../../../gen/api/historical-security-price';

/**
 * Prices the day of each depot value at the latest price on or before it.
 *
 * @param depotValues the days to price, ascending by date
 * @param prices the prices to pick from, ascending by date
 * @returns one price per depot value, in the order of `depotValues`; `null` if there are no depot values or `prices` holds none on or
 * before the first depot value's day
 */
export function pricesPerDay(depotValues: RebasedDepotValue[], prices: HistoricalSecurityPrice[]): number[] | null {
  if (depotValues.length === 0 || prices.length === 0 || prices[0].date > depotValues[0].date) {
    return null;
  }

  const dayPrices: number[] = [];
  let priceIndex: number = 0;

  for (const depotValue of depotValues) {
    while (priceIndex + 1 < prices.length && prices[priceIndex + 1].date <= depotValue.date) {
      priceIndex++;
    }
    dayPrices.push(prices[priceIndex].price);
  }

  return dayPrices;
}
