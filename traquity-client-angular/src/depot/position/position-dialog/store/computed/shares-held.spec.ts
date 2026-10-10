import {beforeEach, describe, expect, it} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {Lot} from '../../../../../gen/api/depot-position';
import {lotFactory} from '../../../../../testing/lot.factory';
import {sharesHeld} from './shares-held';

describe('sharesHeld', (): void => {
  let lots: WritableSignal<Lot[]>;

  beforeEach((): void => {
    lots = signal<Lot[]>([
      lotFactory({count: 20}),
      lotFactory({count: 25})
    ]);
  });

  function result(): Signal<number> {
    return sharesHeld({lots});
  }

  it('sums the share count of every loaded lot', (): void => {
    expect(result()()).toBe(45);
  });

  it('is 0 while no lot is loaded', (): void => {
    lots.set([]);

    expect(result()()).toBe(0);
  });

  it('sums fractional share counts to the decimal total the lots state', (): void => {
    lots.set([lotFactory({count: 0.7}), lotFactory({count: 0.1})]);

    expect(result()()).toBe(0.8);
  });
});
