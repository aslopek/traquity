import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {PositionDialogState, SellSimulationInputs} from '../position-dialog.store';
import {Lot} from '../../../../../gen/api/depot-position';
import {consumeLots, LotConsumption} from '../fifo/consume-lots';

export type LotWithSoldFraction = {
  lot: Lot
  /** The share of the lot the simulated sale consumes, `0 <= soldFraction <= 1`. */
  soldFraction: number
};

export type LotsWithSoldFractionSlice = Pick<PositionDialogState, 'lots' | 'simulationInputs'>;

export function lotsWithSoldFraction(
  signalStore: ReadableSignalStore<LotsWithSoldFractionSlice>): Signal<LotWithSoldFraction[]> {
  return computed((): LotWithSoldFraction[] => {
    const lots: Lot[] = signalStore.lots();
    const inputs: SellSimulationInputs | null = signalStore.simulationInputs();
    if (inputs == null) {
      return lots.map(unsold);
    }

    const {takenPerLot, shortfall}: LotConsumption = consumeLots(lots, inputs.sharesToSell);
    if (shortfall > 0) {
      return lots.map(unsold);
    }

    return lots.map((lot: Lot, index: number): LotWithSoldFraction =>
      lot.count === 0 ? unsold(lot) : {lot, soldFraction: takenPerLot[index] / lot.count});
  });
}

function unsold(lot: Lot): LotWithSoldFraction {
  return {
    lot,
    soldFraction: 0
  };
}
