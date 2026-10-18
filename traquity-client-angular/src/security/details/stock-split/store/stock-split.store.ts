import {StockSplit, StockSplitApi} from '../../../../gen/api/security';
import {ReadableSignalStore, WritableSignalStore} from '../../../../common/types/signal-store.type';
import {signalStore, withComputed, withMethods, withState} from '@ngrx/signals';
import {inject} from '@angular/core';
import {loadStockSplitState} from './methods/load-stock-splits';
import {addStockSplit} from './methods/add-stock-split';
import {setStockSplitParams} from './methods/set-stock-split-params';
import {creationParamsValid} from './computed/creation-params-valid';
import {exDate} from './computed/ex-date';
import {multiplier} from './computed/multiplier';

export type StockSplitComputed = {
  creationParamsValid: () => boolean
  exDate: () => Date
  multiplier: () => number
};

export type StockSplitMethods = {
  addStockSplit: () => void
  loadStockSplits: (securityId: number) => void
  setStockSplitParams: (stockSplitParams: StockSplitParams) => void
};

export type StockSplitParams = {
  exDate: Date
  quantityOld: number
  quantityNew: number
  updateRelatedData: boolean
}

export type StockSplitWithMultiplier = StockSplit & {
  multiplier: number
}

export type StockSplitState = {
  securityId: number | null
  stockSplits: StockSplitWithMultiplier[]
  stockSplitParams: StockSplitParams
};

const yesterday: Date = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const initialState: StockSplitState = {
  securityId: null,
  stockSplits: [],
  stockSplitParams: {
    exDate: yesterday,
    quantityOld: 1,
    quantityNew: 1,
    updateRelatedData: true
  }
} as const;

export type ReadableStockSplitStore = ReadableSignalStore<StockSplitState, StockSplitComputed, StockSplitMethods>;

export const stockSplitStore = signalStore(
  withState(initialState),
  withComputed((signalStore: ReadableSignalStore<StockSplitState>): StockSplitComputed => {
    return {
      creationParamsValid: () => creationParamsValid(signalStore),
      exDate: () => exDate(signalStore),
      multiplier: () => multiplier(signalStore)
    };
  }),
  withMethods((signalStore: WritableSignalStore<StockSplitState, StockSplitComputed>,
               stockSplitApi: StockSplitApi = inject(StockSplitApi)): StockSplitMethods => {
    return {
      addStockSplit: () => addStockSplit(signalStore, stockSplitApi),
      loadStockSplits: (securityId: number) => loadStockSplitState(signalStore, stockSplitApi, securityId),
      setStockSplitParams: (stockSplitParams: StockSplitParams) => setStockSplitParams(signalStore, stockSplitParams)
    };
  })
)
