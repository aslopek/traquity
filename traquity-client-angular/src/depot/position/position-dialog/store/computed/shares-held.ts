import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {PositionDialogState} from '../position-dialog.store';
import {Lot} from '../../../../../gen/api/depot-position';
import {roundShareCount} from '../share-count/round-share-count';

export type SharesHeldSlice = Pick<PositionDialogState, 'lots'>;

/**
 * The sum of every loaded lot's share count, rounded to the precision a share count is exact to, so a position of
 * fractional lots reads as the decimal total those lots state.
 *
 * @param signalStore the store holding the loaded `lots`
 * @returns the rounded total share count, `0` while no lot is loaded
 */
export function sharesHeld(signalStore: ReadableSignalStore<SharesHeldSlice>): Signal<number> {
  return computed((): number =>
    roundShareCount(signalStore.lots().reduce((sum: number, lot: Lot): number => sum + lot.count, 0)));
}
