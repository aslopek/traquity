import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {PositionDialogState} from '../position-dialog.store';
import {Lot} from '../../../../../gen/api/depot-position';

export type CurrentPricePerShareSlice = Pick<PositionDialogState, 'lots'>;

/**
 * @param signalStore the store holding the loaded lots
 * @returns the combined current size of all lots divided by their combined share count, and `null` while no lot is loaded or their combined
 *          share count is `0`
 */
export function currentPricePerShare(signalStore: ReadableSignalStore<CurrentPricePerShareSlice>): Signal<number | null> {
  return computed((): number | null => {
    const lots: Lot[] = signalStore.lots();
    const totalCount: number = lots.reduce((sum: number, lot: Lot): number => sum + lot.count, 0);
    if (lots.length === 0 || totalCount === 0) {
      return null;
    }
    const totalCurrentSize: number = lots.reduce((sum: number, lot: Lot): number => sum + lot.currentSizeAbsolute, 0);
    return totalCurrentSize / totalCount;
  });
}
