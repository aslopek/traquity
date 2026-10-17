import {ReadableSignalStore, WritableSignalStore} from "../../../common/types/signal-store.type";
import {signalStore, withComputed, withMethods, withState} from "@ngrx/signals";
import {Store} from "@ngrx/store";
import {AppState} from "../../../store/app.state";
import {inject, Signal} from "@angular/core";
import {RxMethod} from "@ngrx/signals/rxjs-interop";
import {DepotPerformancePositionApi, PositionPerformance} from "../../../gen/api/depot-performance";
import {relativePerformance} from "./computed/relative-performance";
import {loadPerformanceBreakdown, LoadPerformanceBreakdownArgs} from "./effects/load-performance-breakdown";

export type PerformanceBreakdownState = {
  performance: PositionPerformance | null
  loadFailed: boolean
};

export type PerformanceBreakdownComputed = {
  relativePerformance: Signal<number | "infinity" | null>
};

export type PerformanceBreakdownMethods = {
  load: RxMethod<LoadPerformanceBreakdownArgs>
};

export const initialState: PerformanceBreakdownState = {
  performance: null,
  loadFailed: false
} as const;

export type ReadablePerformanceBreakdownStore =
  ReadableSignalStore<PerformanceBreakdownState, PerformanceBreakdownComputed, PerformanceBreakdownMethods>;

export const PerformanceBreakdownStore = signalStore(
  withState(initialState),
  withComputed((signalStore: ReadableSignalStore<PerformanceBreakdownState>): PerformanceBreakdownComputed => {
    return {
      relativePerformance: relativePerformance(signalStore)
    };
  }),
  withMethods((signalStore: WritableSignalStore<PerformanceBreakdownState, PerformanceBreakdownComputed>): PerformanceBreakdownMethods => {
    const api: DepotPerformancePositionApi = inject(DepotPerformancePositionApi);
    const globalStore: Store<AppState> = inject(Store);
    return {
      load: loadPerformanceBreakdown(signalStore, api, globalStore)
    };
  })
);
