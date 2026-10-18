import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {StockSplitState} from '../stock-split.store';

export function exDate(signalStore: ReadableSignalStore<StockSplitState>) {
  return signalStore.stockSplitParams().exDate;
}
