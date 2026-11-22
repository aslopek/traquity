/**
 * Buys shares with each day's money at that day's price and values the shares held at each day's price. Shares may be fractional. Money
 * due on a day priced `0` waits as money and buys on the next day priced above `0`.
 *
 * @param moneyPerDay the money to invest per day
 * @param dayPrices the price per day, one per entry of `moneyPerDay`
 * @returns per day, the value of the shares bought up to and including that day at that day's price, plus the money not invested yet
 * @throws Error if `moneyPerDay` and `dayPrices` differ in length
 */
export function buyAndHold(moneyPerDay: number[], dayPrices: number[]): number[] {
  if (moneyPerDay.length !== dayPrices.length) {
    throw new Error(`Expected one price per day of money, got ${moneyPerDay.length} days of money and ${dayPrices.length} prices`);
  }

  const values: number[] = [];
  let shares: number = 0;
  let uninvested: number = 0;

  for (const [day, price] of dayPrices.entries()) {
    uninvested += moneyPerDay[day];
    if (price > 0) {
      shares += uninvested / price;
      uninvested = 0;
    }
    values.push(shares * price + uninvested);
  }

  return values;
}
