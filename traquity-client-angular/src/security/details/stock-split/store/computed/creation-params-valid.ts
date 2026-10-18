import {ReadableSignalStore} from '../../../../../common/types/signal-store.type';
import {StockSplitParams, StockSplitState} from '../stock-split.store';
import {StockSplit} from '../../../../../gen/api/security';
import {fromDateString} from '../../../../../common/functions/from-date-string';

export function creationParamsValid(signalStore: ReadableSignalStore<StockSplitState>): boolean {
  const params: StockSplitParams = signalStore.stockSplitParams();
  const quantitiesOk: boolean = params.quantityOld > 0 && params.quantityNew > 0 && (params.quantityNew / params.quantityOld > 1);
  const exDateIsBeforeToday: boolean = isBeforeToday(params.exDate);

  const stockSplits: StockSplit[] = signalStore.stockSplits();
  const exDateIsAfterLastStockSplit: boolean = stockSplits.length === 0
    || isDateBefore(fromDateString(stockSplits[stockSplits.length - 1].exDate), params.exDate)

  return quantitiesOk && exDateIsBeforeToday && exDateIsAfterLastStockSplit;
}

function isBeforeToday(date: Date): boolean {
  const today: Date = new Date();
  const startOfToday: Date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfGivenDate: Date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return startOfGivenDate < startOfToday;
}

function isDateBefore(first: Date, second: Date): boolean {
  const d1: Date = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const d2: Date = new Date(second.getFullYear(), second.getMonth(), second.getDate());
  return d1 < d2;
}