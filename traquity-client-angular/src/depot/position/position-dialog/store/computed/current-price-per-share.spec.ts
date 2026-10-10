import {beforeEach, describe, expect, it} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {Lot} from '../../../../../gen/api/depot-position';
import {lotFactory} from '../../../../../testing/lot.factory';
import {currentPricePerShare} from './current-price-per-share';

describe('currentPricePerShare', (): void => {
  let lots: WritableSignal<Lot[]>;
  let lot1: Lot;
  let lot2: Lot;

  beforeEach((): void => {
    lot1 = lotFactory({date: '2024-01-15', holdingPeriodInDays: 365, count: 20, currentSizeAbsolute: 250});
    lot2 = lotFactory({date: '2024-07-15', holdingPeriodInDays: 183, count: 25, currentSizeAbsolute: 300});
    lots = signal<Lot[]>([lot1, lot2]);
  });

  function result(): Signal<number | null> {
    return currentPricePerShare({lots});
  }

  it('is the combined current size divided by the combined share count', (): void => {
    expect(result()()).toBe((lot1.currentSizeAbsolute + lot2.currentSizeAbsolute) / (lot1.count + lot2.count));
  });

  it('is null while no lot is loaded', (): void => {
    lots.set([]);

    expect(result()()).toBeNull();
  });

  it('is null while every lot\'s share count is 0', (): void => {
    lots.set([lotFactory({count: 0})]);

    expect(result()()).toBeNull();
  });
});
