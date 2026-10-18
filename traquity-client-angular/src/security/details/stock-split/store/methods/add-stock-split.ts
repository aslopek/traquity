import {StockSplit, StockSplitApi} from '../../../../../gen/api/security';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {StockSplitParams, StockSplitState} from '../stock-split.store';
import {catchError, EMPTY, take} from 'rxjs';
import {patchState} from '@ngrx/signals';
import {toDateString} from '../../../../../common/functions/to-date-string';

export function addStockSplit(signalStore: WritableSignalStore<StockSplitState>,
                              stockSplitApi: StockSplitApi): void {
  const securityId: number | null = signalStore.securityId();
  if (securityId == null) {
    return;
  }

  const stockSplitParams: StockSplitParams = signalStore.stockSplitParams();

  const stockSplit: StockSplit = {
    exDate: toDateString(stockSplitParams.exDate),
    quantityOld: stockSplitParams.quantityOld,
    quantityNew: stockSplitParams.quantityNew
  };

  const updateRelatedData: boolean = stockSplitParams.updateRelatedData;
  stockSplitApi.createStockSplit(securityId, updateRelatedData, updateRelatedData, stockSplit).pipe(
    take(1),
    catchError(() => EMPTY)
  ).subscribe((result: StockSplit) => {
    if (result != null) {
      patchState(signalStore, {
        stockSplits: [
          ...signalStore.stockSplits(),
          {
            ...result,
            multiplier: result.quantityNew / result.quantityOld
          }
        ]
      })
    }
  })
}
