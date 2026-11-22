import {beforeEach, describe, expect, it} from '@jest/globals';
import {buyAndHold} from './buy-and-hold';

describe('buyAndHold', (): void => {
  let moneyPerDay: number[];
  let dayPrices: number[];

  beforeEach((): void => {
    moneyPerDay = [100, 30, 50, 0];
    dayPrices = [10, 20, 25, 50];
  });

  it('buys with each day\'s money at that day\'s price and values the shares held at each day\'s price', (): void => {
    // day 0: 0 shares held, buys 100 / 10 = 10, holds 10, worth 10 * 10 = 100
    // day 1: 10 shares held, buys 30 / 20 = 1.5, holds 11.5, worth 11.5 * 20 = 230
    // day 2: 11.5 shares held, buys 50 / 25 = 2, holds 13.5, worth 13.5 * 25 = 337.5
    // day 3: 13.5 shares held, buys 0 / 50 = 0, holds 13.5, worth 13.5 * 50 = 675
    expect(buyAndHold(moneyPerDay, dayPrices)).toEqual([100, 230, 337.5, 675]);
  });

  it('values the shares held on a day priced 0 at 0 and its money as money until the next day priced above 0 buys with it', (): void => {
    dayPrices = [10, 0, 40, 50];

    // day 0: 0 shares held, buys 100 / 10 = 10, holds 10, worth 10 * 10 = 100
    // day 1: 10 shares held, buys none (30 waits), holds 10, worth 10 * 0 + 30 = 30
    // day 2: 10 shares held, buys (30 + 50) / 40 = 2, holds 12, worth 12 * 40 = 480
    // day 3: 12 shares held, buys 0 / 50 = 0, holds 12, worth 12 * 50 = 600
    expect(buyAndHold(moneyPerDay, dayPrices)).toEqual([100, 30, 480, 600]);
  });

  it('buys with the money of several days in a row priced 0 on the next day priced above 0', (): void => {
    dayPrices = [10, 0, 0, 40];

    // day 0: 0 shares held, buys 100 / 10 = 10, holds 10, worth 10 * 10 = 100
    // day 1: 10 shares held, buys none (30 waits), holds 10, worth 10 * 0 + 30 = 30
    // day 2: 10 shares held, buys none (30 + 50 wait), holds 10, worth 10 * 0 + 80 = 80
    // day 3: 10 shares held, buys (30 + 50 + 0) / 40 = 2, holds 12, worth 12 * 40 = 480
    expect(buyAndHold(moneyPerDay, dayPrices)).toEqual([100, 30, 80, 480]);
  });

  it('buys with the money of a first day priced 0 on the next day priced above 0 and values it as money until then', (): void => {
    dayPrices = [0, 20, 25, 50];

    // day 0: 0 shares held, buys none (100 waits), holds 0, worth 0 * 0 + 100 = 100
    // day 1: 0 shares held, buys (100 + 30) / 20 = 6.5, holds 6.5, worth 6.5 * 20 = 130
    // day 2: 6.5 shares held, buys 50 / 25 = 2, holds 8.5, worth 8.5 * 25 = 212.5
    // day 3: 8.5 shares held, buys 0 / 50 = 0, holds 8.5, worth 8.5 * 50 = 425
    expect(buyAndHold(moneyPerDay, dayPrices)).toEqual([100, 130, 212.5, 425]);
  });

  it('values the shares held on trailing days priced 0 at 0 and the money due on them as money', (): void => {
    dayPrices = [10, 20, 0, 0];

    // day 0: 0 shares held, buys 100 / 10 = 10, holds 10, worth 10 * 10 = 100
    // day 1: 10 shares held, buys 30 / 20 = 1.5, holds 11.5, worth 11.5 * 20 = 230
    // day 2: 11.5 shares held, buys none (50 waits), holds 11.5, worth 11.5 * 0 + 50 = 50
    // day 3: 11.5 shares held, buys none (50 + 0 wait), holds 11.5, worth 11.5 * 0 + 50 = 50
    expect(buyAndHold(moneyPerDay, dayPrices)).toEqual([100, 230, 50, 50]);
  });

  it('never buys if every day is priced 0 and values the money due as money', (): void => {
    dayPrices = [0, 0, 0, 0];

    // day 0: 0 shares held, buys none (100 waits), holds 0, worth 0 * 0 + 100 = 100
    // day 1: 0 shares held, buys none (100 + 30 wait), holds 0, worth 0 * 0 + 130 = 130
    // day 2: 0 shares held, buys none (100 + 30 + 50 wait), holds 0, worth 0 * 0 + 180 = 180
    // day 3: 0 shares held, buys none (100 + 30 + 50 + 0 wait), holds 0, worth 0 * 0 + 180 = 180
    expect(buyAndHold(moneyPerDay, dayPrices)).toEqual([100, 130, 180, 180]);
  });

  it('throws if there are fewer days of money than prices', (): void => {
    moneyPerDay = [100, 30, 50];

    expect((): number[] => buyAndHold(moneyPerDay, dayPrices))
      .toThrow(new Error('Expected one price per day of money, got 3 days of money and 4 prices'));
  });

  it('throws if there are more days of money than prices', (): void => {
    moneyPerDay = [100, 30, 50, 0, 20];

    expect((): number[] => buyAndHold(moneyPerDay, dayPrices))
      .toThrow(new Error('Expected one price per day of money, got 5 days of money and 4 prices'));
  });
});
