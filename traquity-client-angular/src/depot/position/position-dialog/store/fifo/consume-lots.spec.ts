import {beforeEach, describe, expect, it} from '@jest/globals';
import {Lot} from '../../../../../gen/api/depot-position';
import {lotFactory} from '../../../../../testing/lot.factory';
import {consumeLots, LotConsumption} from './consume-lots';

describe('consumeLots', (): void => {
  let lot1: Lot;
  let lot2: Lot;
  let lots: Lot[];
  let sharesToSell: number;

  beforeEach((): void => {
    lot1 = lotFactory({date: '2024-01-15', holdingPeriodInDays: 365, count: 20});
    lot2 = lotFactory({date: '2024-07-15', holdingPeriodInDays: 183, count: 25});
    lots = [lot1, lot2];
    sharesToSell = 10;
  });

  function result(): LotConsumption {
    return consumeLots(lots, sharesToSell);
  }

  it('takes from the oldest lot alone while the sale stays inside it', (): void => {
    expect(result()).toEqual({takenPerLot: [sharesToSell, 0], shortfall: 0});
  });

  it('walks into the younger lot once the sale exceeds the oldest one', (): void => {
    sharesToSell = 30;

    expect(result()).toEqual({takenPerLot: [lot1.count, sharesToSell - lot1.count], shortfall: 0});
  });

  it('takes every lot fully once the whole position is sold', (): void => {
    sharesToSell = lot1.count + lot2.count;

    expect(result()).toEqual({takenPerLot: [lot1.count, lot2.count], shortfall: 0});
  });

  it('reports the uncovered share count as the shortfall', (): void => {
    sharesToSell = lot1.count + lot2.count + 6.5;

    expect(result()).toEqual({takenPerLot: [lot1.count, lot2.count], shortfall: 6.5});
  });

  it('takes every lot fully for a decimal total that the summed lot counts miss by representation error', (): void => {
    lot1 = lotFactory({date: '2024-01-15', holdingPeriodInDays: 365, count: 0.7});
    lot2 = lotFactory({date: '2024-07-15', holdingPeriodInDays: 183, count: 0.1});
    lots = [lot1, lot2];
    sharesToSell = 0.8;

    expect(result()).toEqual({takenPerLot: [lot1.count, lot2.count], shortfall: 0});
    expect(lot1.count + lot2.count).not.toBe(sharesToSell); // rounding error for the chosen lot sizes
  });

  it('takes nothing while the sale is 0', (): void => {
    sharesToSell = 0;

    expect(result()).toEqual({takenPerLot: [0, 0], shortfall: 0});
  });

  it('passes over a lot holding no shares', (): void => {
    lots = [
      lotFactory({date: '2023-05-02', holdingPeriodInDays: 622, count: 0}),
      lot1
    ];

    expect(result()).toEqual({takenPerLot: [0, sharesToSell], shortfall: 0});
  });

  it('takes nothing and demands the whole sale while no lot is given', (): void => {
    lots = [];

    expect(result()).toEqual({takenPerLot: [], shortfall: sharesToSell});
  });
});
