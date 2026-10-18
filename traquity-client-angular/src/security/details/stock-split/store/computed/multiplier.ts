import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {StockSplitParams, StockSplitState} from '../stock-split.store';

export function multiplier(signalStore: ReadableSignalStore<StockSplitState>): number {
  const stockSplitParams: StockSplitParams = signalStore.stockSplitParams();
  return stockSplitParams.quantityNew / stockSplitParams.quantityOld;
}
