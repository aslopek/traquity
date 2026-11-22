import {beforeEach, describe, expect, it} from '@jest/globals';
import {pricesPerDay} from './prices-per-day';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {HistoricalSecurityPrice} from '../../../../gen/api/historical-security-price';
import {rebasedDepotValueFactory} from '../../../../testing/rebased-depot-value.factory';
import {historicalSecurityPriceFactory} from '../../../../testing/historical-security-price.factory';

describe('pricesPerDay', (): void => {
  let depotValues: RebasedDepotValue[];
  let prices: HistoricalSecurityPrice[];

  beforeEach((): void => {
    depotValues = [
      rebasedDepotValueFactory({date: '2026-01-01'}),
      rebasedDepotValueFactory({date: '2026-01-02'}),
      rebasedDepotValueFactory({date: '2026-01-03'}),
      rebasedDepotValueFactory({date: '2026-01-04'})
    ];

    prices = [
      historicalSecurityPriceFactory({date: '2026-01-01', price: 10}),
      historicalSecurityPriceFactory({date: '2026-01-02', price: 20}),
      historicalSecurityPriceFactory({date: '2026-01-03', price: 25}),
      historicalSecurityPriceFactory({date: '2026-01-04', price: 50})
    ];
  });

  it('prices each day at its own price', (): void => {
    expect(pricesPerDay(depotValues, prices)).toEqual([10, 20, 25, 50]);
  });

  it('prices a day without a price of its own at the latest price before it', (): void => {
    prices = [
      historicalSecurityPriceFactory({date: '2026-01-01', price: 10}),
      historicalSecurityPriceFactory({date: '2026-01-02', price: 20}),
      historicalSecurityPriceFactory({date: '2026-01-04', price: 50})
    ];

    expect(pricesPerDay(depotValues, prices)).toEqual([10, 20, 20, 50]);
  });

  it('prices the first day at the latest price before it if it has no price of its own', (): void => {
    prices = [
      historicalSecurityPriceFactory({date: '2025-12-30', price: 4}),
      historicalSecurityPriceFactory({date: '2025-12-31', price: 5}),
      historicalSecurityPriceFactory({date: '2026-01-02', price: 20}),
      historicalSecurityPriceFactory({date: '2026-01-03', price: 25}),
      historicalSecurityPriceFactory({date: '2026-01-04', price: 50})
    ];

    expect(pricesPerDay(depotValues, prices)).toEqual([5, 20, 25, 50]);
  });

  it('returns null if the oldest price is younger than the first day', (): void => {
    prices = [
      historicalSecurityPriceFactory({date: '2026-01-02', price: 20}),
      historicalSecurityPriceFactory({date: '2026-01-03', price: 25}),
      historicalSecurityPriceFactory({date: '2026-01-04', price: 50})
    ];

    expect(pricesPerDay(depotValues, prices)).toBeNull();
  });

  it('returns null without prices', (): void => {
    prices = [];

    expect(pricesPerDay(depotValues, prices)).toBeNull();
  });

  it('returns null without depot values', (): void => {
    depotValues = [];

    expect(pricesPerDay(depotValues, prices)).toBeNull();
  });
});
