import {beforeEach, describe, expect, it} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {Lot} from '../../../../../gen/api/depot-position';
import {lotFactory} from '../../../../../testing/lot.factory';
import {SellSimulationInputs} from '../position-dialog.store';
import {SaleResult, saleResult} from './sale-result';

describe('saleResult', (): void => {
  let lot1: Lot;
  let lot2: Lot;
  let lots: WritableSignal<Lot[]>;
  let simulationInputs: WritableSignal<SellSimulationInputs | null>;

  beforeEach((): void => {
    lot1 = lotFactory({date: '2024-01-15', holdingPeriodInDays: 365, count: 20, buyInAbsolute: 200, fee: 6, tax: 3});
    lot2 = lotFactory({date: '2024-07-15', holdingPeriodInDays: 183, count: 25, buyInAbsolute: 300, fee: 5, tax: 9});
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

  function result(): Signal<SaleResult | null> {
    return saleResult({lots, simulationInputs});
  }

  it('takes the cost basis from the oldest lot alone while the sale stays inside it', (): void => {
    const costBasis: number = (lot1.buyInAbsolute + lot1.fee + lot1.tax) * (10 / lot1.count);
    const grossValue: number = 10 * 15;
    const taxableGain: number = (grossValue - 2 - costBasis) * (1 - 0 / 100);

    expect(result()()).toEqual({
      grossValue,
      taxableGain,
      taxes: taxableGain * (25 / 100),
      netValue: grossValue - 2 - taxableGain * (25 / 100)
    });
  });

  it('walks into the younger lot once the sale exceeds the oldest one', (): void => {
    simulationInputs.set({...simulationInputs()!, sharesToSell: 30});

    const costBasis: number = (lot1.buyInAbsolute + lot1.fee + lot1.tax)
      + (lot2.buyInAbsolute + lot2.fee + lot2.tax) * (10 / lot2.count);
    const grossValue: number = 30 * 15;
    const taxableGain: number = (grossValue - 2 - costBasis) * (1 - 0 / 100);

    expect(result()()).toEqual({
      grossValue,
      taxableGain,
      taxes: taxableGain * (25 / 100),
      netValue: grossValue - 2 - taxableGain * (25 / 100)
    });
  });

  it('takes every lot fully once the whole position is sold', (): void => {
    const wholePosition: number = lot1.count + lot2.count;
    simulationInputs.set({...simulationInputs()!, sharesToSell: wholePosition});

    const costBasis: number = (lot1.buyInAbsolute + lot1.fee + lot1.tax) + (lot2.buyInAbsolute + lot2.fee + lot2.tax);
    const grossValue: number = wholePosition * 15;
    const taxableGain: number = (grossValue - 2 - costBasis) * (1 - 0 / 100);

    expect(result()()).toEqual({
      grossValue,
      taxableGain,
      taxes: taxableGain * (25 / 100),
      netValue: grossValue - 2 - taxableGain * (25 / 100)
    });
  });

  it('takes every lot fully for a fractional share count matching the whole position', (): void => {
    lot1 = lotFactory({date: '2024-01-15', holdingPeriodInDays: 365, count: 20.5, buyInAbsolute: 200, fee: 6, tax: 3});
    lot2 = lotFactory({date: '2024-07-15', holdingPeriodInDays: 183, count: 24.75, buyInAbsolute: 300, fee: 5, tax: 9});
    lots.set([lot1, lot2]);
    const wholePosition: number = lot1.count + lot2.count;
    simulationInputs.set({...simulationInputs()!, sharesToSell: wholePosition});

    const costBasis: number = (lot1.buyInAbsolute + lot1.fee + lot1.tax) + (lot2.buyInAbsolute + lot2.fee + lot2.tax);
    const grossValue: number = wholePosition * 15;
    const taxableGain: number = (grossValue - 2 - costBasis) * (1 - 0 / 100);

    expect(result()()).toEqual({
      grossValue,
      taxableGain,
      taxes: taxableGain * (25 / 100),
      netValue: grossValue - 2 - taxableGain * (25 / 100)
    });
  });

  it('takes every lot fully for a decimal total that the summed lot counts miss by representation error', (): void => {
    lot1 = lotFactory({date: '2024-01-15', holdingPeriodInDays: 365, count: 0.7, buyInAbsolute: 2, fee: 0.1, tax: 0.02});
    lot2 = lotFactory({date: '2024-07-15', holdingPeriodInDays: 183, count: 0.1, buyInAbsolute: 1, fee: 0.05, tax: 0.01});
    lots.set([lot1, lot2]);
    const wholePosition: number = 0.8;
    simulationInputs.set({...simulationInputs()!, sharesToSell: wholePosition});

    const costBasis: number = (lot1.buyInAbsolute + lot1.fee + lot1.tax) + (lot2.buyInAbsolute + lot2.fee + lot2.tax);
    const grossValue: number = wholePosition * 15;
    const taxableGain: number = (grossValue - 2 - costBasis) * (1 - 0 / 100);

    expect(result()()).toEqual({
      grossValue,
      taxableGain,
      taxes: taxableGain * (25 / 100),
      netValue: grossValue - 2 - taxableGain * (25 / 100)
    });
    expect(lot1.count + lot2.count).not.toBe(wholePosition); // rounding error for the chosen lot sizes
  });

  it('drops the fees out of the taxable gain, but not the net value, while the switch is off', (): void => {
    simulationInputs.set({...simulationInputs()!, feesReduceTaxableGain: false});

    const costBasis: number = (lot1.buyInAbsolute + lot1.tax) * (10 / lot1.count); // no buy fee added to the cost basis
    const grossValue: number = 10 * 15;
    const taxableGain: number = (grossValue - costBasis) * (1 - 0 / 100); // no sell fee deducted from gross value

    expect(result()()).toEqual({
      grossValue,
      taxableGain,
      taxes: taxableGain * (25 / 100),
      netValue: grossValue - 2 - taxableGain * (25 / 100) // sell fee still deducted from gross value
    });
  });

  it('drops the buy taxes out of the taxable gain while the switch is off', (): void => {
    simulationInputs.set({...simulationInputs()!, buyTaxesReduceTaxableGain: false});

    const costBasis: number = (lot1.buyInAbsolute + lot1.fee) * (10 / lot1.count); // no buy tax added to the cost basis
    const grossValue: number = 10 * 15;
    const taxableGain: number = (grossValue - 2 - costBasis) * (1 - 0 / 100);

    expect(result()()).toEqual({
      grossValue,
      taxableGain,
      taxes: taxableGain * (25 / 100),
      netValue: grossValue - 2 - taxableGain * (25 / 100)
    });
  });

  it('takes the plain buy-in as the cost basis while both switches are off', (): void => {
    simulationInputs.set({...simulationInputs()!, feesReduceTaxableGain: false, buyTaxesReduceTaxableGain: false});

    const costBasis: number = lot1.buyInAbsolute * (10 / lot1.count); // neither buy tax nor buy fee added to cost basis
    const grossValue: number = 10 * 15;
    const taxableGain: number = (grossValue - costBasis) * (1 - 0 / 100); // neither tax nor fee deducted from gross value

    expect(result()()).toEqual({
      grossValue,
      taxableGain,
      taxes: taxableGain * (25 / 100),
      netValue: grossValue - 2 - taxableGain * (25 / 100) // sell fee still deducted from gross value
    });
  });

  it('taxes a loss with exactly 0 while the taxable gain stays negative', (): void => {
    simulationInputs.set({...simulationInputs()!, pricePerShare: 1});

    const costBasis: number = (lot1.buyInAbsolute + lot1.fee + lot1.tax) * (10 / lot1.count);
    const grossValue: number = 10;
    const taxableGain: number = (grossValue - 2 - costBasis) * (1 - 0 / 100);

    expect(result()()).toEqual({
      grossValue,
      taxableGain,
      taxes: 0,
      netValue: grossValue - 2
    });
    expect(taxableGain).toBeLessThan(0);
  });

  it('is null while no simulation input is set', (): void => {
    simulationInputs.set(null);

    expect(result()()).toBeNull();
  });

  it('is null while the share count to sell exceeds the loaded lots', (): void => {
    simulationInputs.set({...simulationInputs()!, sharesToSell: lot1.count + lot2.count + 1});

    expect(result()()).toBeNull();
  });

  it('skips a lot with a share count of 0', (): void => {
    lots.set([
      lotFactory({date: '2023-05-02', holdingPeriodInDays: 622, count: 0}),
      lot1
    ]);

    const costBasis: number = (lot1.buyInAbsolute + lot1.fee + lot1.tax) * (10 / lot1.count);
    const grossValue: number = 10 * 15;
    const taxableGain: number = (grossValue - 2 - costBasis) * (1 - 0 / 100);

    expect(result()()).toEqual({
      grossValue,
      taxableGain,
      taxes: taxableGain * (25 / 100),
      netValue: grossValue - 2 - taxableGain * (25 / 100)
    });
  });

  it('is null while no lots are loaded at all', (): void => {
    lots.set([]);

    expect(result()()).toBeNull();
  });
});
