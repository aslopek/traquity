import {StockSplitState, StockSplitWithMultiplier} from '../stock-split.store';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {StockSplit, StockSplitApi} from '../../../../../gen/api/security';
import {catchError, EMPTY, Observable, take} from 'rxjs';
import {patchState} from '@ngrx/signals';

export function loadStockSplitState(signalStore: WritableSignalStore<StockSplitState>,
                                    stockSplitApi: StockSplitApi,
                                    securityId: number): void {
  stockSplitApi.getStockSplits(securityId).pipe(
    take(1),
    catchError((): Observable<never> => EMPTY))
    .subscribe((stockSplits: StockSplit[]) => {
      const stockSplitsWithMultiplier: StockSplitWithMultiplier[] = [];

      for (const stockSplit of stockSplits) {
        stockSplitsWithMultiplier.push({
          ...stockSplit,
          multiplier: stockSplit.quantityNew / stockSplit.quantityOld
        });
      }

      patchState(signalStore, {
        securityId,
        stockSplits: stockSplitsWithMultiplier
      })
    })
}
