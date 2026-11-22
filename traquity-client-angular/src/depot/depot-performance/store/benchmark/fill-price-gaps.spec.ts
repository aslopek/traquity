import {beforeEach, describe, expect, it} from '@jest/globals';
import {fillPriceGaps} from './fill-price-gaps';

describe('fillPriceGaps', (): void => {
  let dayPrices: number[];

  beforeEach((): void => {
    dayPrices = [10, 20, 25, 50];
  });

  it('keeps prices above 0', (): void => {
    expect(fillPriceGaps(dayPrices)).toEqual([10, 20, 25, 50]);
  });

  it('replaces a 0 followed by a price above 0 with the latest price above 0 before it', (): void => {
    dayPrices = [10, 0, 25, 50];

    expect(fillPriceGaps(dayPrices)).toEqual([10, 10, 25, 50]);
  });

  it('replaces several 0s in a row followed by a price above 0 with the latest price above 0 before them', (): void => {
    dayPrices = [10, 20, 0, 0, 50];

    expect(fillPriceGaps(dayPrices)).toEqual([10, 20, 20, 20, 50]);
  });

  it('keeps a 0 without a price above 0 before it', (): void => {
    dayPrices = [0, 0, 25, 50];

    expect(fillPriceGaps(dayPrices)).toEqual([0, 0, 25, 50]);
  });

  it('keeps the 0s after the last price above 0', (): void => {
    dayPrices = [10, 0, 25, 0, 0];

    expect(fillPriceGaps(dayPrices)).toEqual([10, 10, 25, 0, 0]);
  });

  it('keeps 0s only', (): void => {
    dayPrices = [0, 0, 0];

    expect(fillPriceGaps(dayPrices)).toEqual([0, 0, 0]);
  });

  it('returns no prices for no prices', (): void => {
    dayPrices = [];

    expect(fillPriceGaps(dayPrices)).toEqual([]);
  });

  it('leaves the given prices unchanged', (): void => {
    dayPrices = [10, 0, 25, 50];

    fillPriceGaps(dayPrices);

    expect(dayPrices).toEqual([10, 0, 25, 50]);
  });
});
