import {Lot} from '../../../../../gen/api/depot-position';
import {roundShareCount} from '../share-count/round-share-count';

export type LotConsumption = {
  /** How many shares the sale takes from the lot at the same index of the consumed list, one entry per lot. */
  takenPerLot: number[]
  /** The share count the sale still demands once every lot is exhausted, `0` once the lots covered it. */
  shortfall: number
};

/**
 * Walks `lots` in order and takes from each as many shares as the sale still demands, in the given order.
 * Rounds the remainder to a share count's exact precision after every lot, which is what keeps a sale of
 * exactly the lots' decimal total from reporting a representation-error shortfall.
 *
 * @param lots lots to consume from, in the order they are taken from
 * @param sharesToSell share count the sale demands
 * @returns how many shares were taken from each lot, and any share count the sale still demands once every lot is exhausted
 */
export function consumeLots(lots: Lot[], sharesToSell: number): LotConsumption {
  let remaining: number = roundShareCount(sharesToSell);
  const takenPerLot: number[] = [];

  for (const lot of lots) {
    const taken: number = Math.min(lot.count, remaining);
    remaining = roundShareCount(remaining - taken);
    takenPerLot.push(taken);
  }

  return {
    takenPerLot,
    shortfall: remaining
  };
}
