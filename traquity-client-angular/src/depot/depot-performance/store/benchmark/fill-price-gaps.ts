/**
 * Replaces each price of `0` that is followed by a price above `0` with the latest price above `0` before it. Prices of `0` without such a
 * price before them, and those after the last price above `0`, stay `0`.
 *
 * @param dayPrices the price per day
 * @returns the price per day, with the gaps filled
 */
export function fillPriceGaps(dayPrices: number[]): number[] {
  let lastPricedDay: number = -1;
  for (const [day, price] of dayPrices.entries()) {
    if (price > 0) {
      lastPricedDay = day;
    }
  }

  const filled: number[] = [];
  let latestPrice: number = 0;

  for (const [day, price] of dayPrices.entries()) {
    if (price > 0) {
      latestPrice = price;
    }
    filled.push(day < lastPricedDay ? latestPrice : price);
  }

  return filled;
}
