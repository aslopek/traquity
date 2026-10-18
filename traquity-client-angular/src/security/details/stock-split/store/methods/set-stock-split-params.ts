import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {StockSplitParams, StockSplitState} from '../stock-split.store';
import {patchState} from '@ngrx/signals';

export function setStockSplitParams(signalStore: WritableSignalStore<StockSplitState>, stockSplitParams: StockSplitParams): void {
  if (stockSplitParams.quantityNew < 0 || stockSplitParams.quantityOld < 0) {
    return;
  }

  patchState(signalStore, {
    stockSplitParams
  });
}
