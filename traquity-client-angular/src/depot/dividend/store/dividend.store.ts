import {AggregatedDividends, getAggregatedDividends} from "./computed/get-aggregated-dividends";
import {ReadableSignalStore} from "../../../common/types/signal-store.type";
import {signalStore, withComputed, withMethods, withState} from "@ngrx/signals";
import {Store} from "@ngrx/store";
import {AppState} from "../../../store/app.state";
import {computed, inject, Signal} from "@angular/core";
import {Dividends} from "../../../gen/api/depot-dividend";
import {dividendAggregationTimespan, dividends, useDividendGrossValues} from "../../../store/depot/depot.selector";
import {Timespan} from "../../../common/types/timespan";

export type DividendStoreComputed = {
  aggregatedDividends: Signal<AggregatedDividends>
};

export type DividendStoreMethods = {};

export type DividendStoreState = {};

const initialState: DividendStoreState = {} as const;

export type ReadableDividendStore = ReadableSignalStore<DividendStoreState, DividendStoreComputed, DividendStoreMethods>;

export const dividendStore = signalStore(
  withState(initialState),
  withComputed((signalStore: ReadableSignalStore<DividendStoreState>,
                globalStore: Store<AppState> = inject(Store)): DividendStoreComputed => {
    const d: Signal<Dividends | null> = globalStore.selectSignal(dividends);
    const timespan: Signal<Timespan> = globalStore.selectSignal(dividendAggregationTimespan);
    const useGrossValues: Signal<boolean> = globalStore.selectSignal(useDividendGrossValues);
    const aggregatedDividends: Signal<AggregatedDividends> = computed(() => getAggregatedDividends(d(), timespan(), useGrossValues()));

    return {
      aggregatedDividends: aggregatedDividends
    };
  }),
  withMethods((): DividendStoreMethods => {
    return {};
  })
);
