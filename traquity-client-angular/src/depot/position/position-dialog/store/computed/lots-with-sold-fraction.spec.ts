import {beforeEach, describe, expect, it} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {Lot} from '../../../../../gen/api/depot-position';
import {lotFactory} from '../../../../../testing/lot.factory';
import {SellSimulationInputs} from '../position-dialog.store';
import {LotWithSoldFraction, lotsWithSoldFraction} from './lots-with-sold-fraction';

describe('lotsWithSoldFraction', (): void => {
  let lot1: Lot;
  let lot2: Lot;
  let lots: WritableSignal<Lot[]>;
  let simulationInputs: WritableSignal<SellSimulationInputs | null>;

  beforeEach((): void => {
    lot1 = lotFactory({date: '2024-01-15', holdingPeriodInDays: 365, count: 20});
    lot2 = lotFactory({date: '2024-07-15', holdingPeriodInDays: 183, count: 25});
    lots = signal<Lot[]>([lot1, lot2]);
    simulationInputs = signal<SellSimulationInputs | null>({
      sharesToSell: 10,
      pricePerShare: 15,
      taxFreeGainsPercent: 0,
      taxRatePercent: 25,
      fee: 2,
      feesReduceTaxableGain: true,
      buyTaxesReduceTaxableGain: true
    });
  });

  function result(): Signal<LotWithSoldFraction[]> {
    return lotsWithSoldFraction({lots, simulationInputs});
  }

  it('sells a share of the oldest lot alone while the sale stays inside it', (): void => {
    expect(result()()).toEqual([
      {lot: lot1, soldFraction: 10 / lot1.count},
      {lot: lot2, soldFraction: 0}
    ]);
  });

  it('sells the oldest lot whole and a share of the younger one once the sale exceeds the oldest', (): void => {
    simulationInputs.set({...simulationInputs()!, sharesToSell: 30});

    expect(result()()).toEqual([
      {lot: lot1, soldFraction: 1},
      {lot: lot2, soldFraction: (30 - lot1.count) / lot2.count}
    ]);
  });

  it('sells every lot whole once the whole position is sold', (): void => {
    simulationInputs.set({...simulationInputs()!, sharesToSell: lot1.count + lot2.count});

    expect(result()()).toEqual([
      {lot: lot1, soldFraction: 1},
      {lot: lot2, soldFraction: 1}
    ]);
  });

  it('sells every lot whole for a decimal total that the summed lot counts miss by representation error', (): void => {
    lot1 = lotFactory({date: '2024-01-15', holdingPeriodInDays: 365, count: 0.7});
    lot2 = lotFactory({date: '2024-07-15', holdingPeriodInDays: 183, count: 0.1});
    lots.set([lot1, lot2]);
    simulationInputs.set({...simulationInputs()!, sharesToSell: 0.8});

    expect(result()()).toEqual([
      {lot: lot1, soldFraction: 1},
      {lot: lot2, soldFraction: 1}
    ]);
    expect(lot1.count + lot2.count).not.toBe(0.8); // rounding error for the chosen lot sizes
  });

  it('sells nothing while no simulation input is set', (): void => {
    simulationInputs.set(null);

    expect(result()()).toEqual([
      {lot: lot1, soldFraction: 0},
      {lot: lot2, soldFraction: 0}
    ]);
  });

  it('sells nothing while the share count to sell exceeds the loaded lots', (): void => {
    simulationInputs.set({...simulationInputs()!, sharesToSell: lot1.count + lot2.count + 1});

    expect(result()()).toEqual([
      {lot: lot1, soldFraction: 0},
      {lot: lot2, soldFraction: 0}
    ]);
  });

  it('sells nothing of a lot holding no shares', (): void => {
    const empty: Lot = lotFactory({date: '2023-05-02', holdingPeriodInDays: 622, count: 0});
    lots.set([empty, lot1]);

    expect(result()()).toEqual([
      {lot: empty, soldFraction: 0},
      {lot: lot1, soldFraction: 10 / lot1.count}
    ]);
  });

  it('is empty while no lot is loaded', (): void => {
    lots.set([]);

    expect(result()()).toEqual([]);
  });
});
