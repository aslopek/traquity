import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {PositionDialogState, SellSimulationInputs} from '../position-dialog.store';
import {consumeLots, LotConsumption} from '../fifo/consume-lots';
import {Lot} from '../../../../../gen/api/depot-position';

export type SaleResult = { grossValue: number, taxableGain: number, taxes: number, netValue: number };
export type SaleResultSlice = Pick<PositionDialogState, 'lots' | 'simulationInputs'>;

/**
 * @param signalStore the store slice holding the loaded lots and the sell simulation inputs
 * @returns the outcome of selling `simulationInputs.sharesToSell` shares, taking the cost basis from the loaded lots
 * oldest first (FIFO); `null` while no simulation input is set, and while the share count to sell exceeds what the
 * loaded lots hold by more than a share count's exact precision
 */
export function saleResult(signalStore: ReadableSignalStore<SaleResultSlice>): Signal<SaleResult | null> {
  return computed((): SaleResult | null => {
    const inputs: SellSimulationInputs | null = signalStore.simulationInputs();
    if (inputs == null) {
      return null;
    }

    const {
      sharesToSell, pricePerShare, taxFreeGainsPercent, taxRatePercent, fee, feesReduceTaxableGain, buyTaxesReduceTaxableGain
    } = inputs;

    const lots: Lot[] = signalStore.lots();
    const {takenPerLot, shortfall}: LotConsumption = consumeLots(lots, sharesToSell);
    if (shortfall > 0) {
      return null;
    }

    let costBasis: number = 0;
    lots.forEach((lot: Lot, index: number): void => {
      if (lot.count === 0) {
        return;
      }
      const buyFee: number = feesReduceTaxableGain ? lot.fee : 0;
      const buyTax: number = buyTaxesReduceTaxableGain ? lot.tax : 0;
      costBasis += (lot.buyInAbsolute + buyFee + buyTax) * (takenPerLot[index] / lot.count);
    });

    const sellFee: number = feesReduceTaxableGain ? fee : 0;
    const grossValue: number = sharesToSell * pricePerShare;
    const gain: number = grossValue - sellFee - costBasis;
    const taxableGain: number = gain * (1 - taxFreeGainsPercent / 100);
    const taxes: number = Math.max(0, taxableGain * (taxRatePercent / 100));
    const netValue: number = grossValue - fee - taxes;

    return {grossValue, taxableGain, taxes, netValue};
  });
}
