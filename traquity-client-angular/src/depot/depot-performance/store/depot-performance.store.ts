import {ReadableSignalStore, WritableSignalStore} from "../../../common/types/signal-store.type";
import {signalStore, withComputed, withHooks, withMethods, withState} from "@ngrx/signals";
import {Store} from "@ngrx/store";
import {AppState} from "../../../store/app.state";
import {computed, inject, Signal} from "@angular/core";
import {DataRange} from "../../../common/types/data-range";
import {setDataRange} from "./methods/set-data-range";
import {extendedInternalRateOfReturn} from "./computed/extended-internal-rate-of-return";
import {depotValues, DepotValuesResult} from "./computed/depot-values";
import {RebasedDepotValue} from "./computed/rebased-depot-value.type";
import {DepotPerformanceKpis, depotPerformanceKpis} from "./computed/depot-performance-kpis";
import {DataRanges, dataRanges} from "./computed/data-ranges";
import {setShowInvestedCapital} from "./methods/set-show-invested-capital";
import {setAddCashToAbsoluteValue} from "./methods/set-add-cash-to-absolute-value";
import {selectedDepotIds} from "../../../store/depot/depot.selector";
import {loadTransactions, LoadTransactionsArgs} from "./effects/load-transactions";
import {TransactionApi, TransactionRead} from "../../../gen/api/depot-transaction";
import {RxMethod} from "@ngrx/signals/rxjs-interop";
import {groupedTransaction, TransactionGroup} from "./computed/grouped-transactions";
import {Benchmark, BenchmarkResult} from "./benchmark/benchmark.type";
import {setBenchmark} from "./methods/set-benchmark";
import {benchmarkResult} from "./computed/benchmark-result";

export type DepotPerformanceComputed = {
  benchmarkResult: Signal<BenchmarkResult | [BenchmarkResult, BenchmarkResult] | null>
  dataRanges: Signal<DataRanges>
  depotValues: Signal<RebasedDepotValue[]>
  extendedInternalRateOfReturn: Signal<number>
  filteredDepotValues: Signal<boolean>
  groupedTransactions: Signal<TransactionGroup[]>
  kpis: Signal<DepotPerformanceKpis>
};

export type DepotPerformanceMethods = {
  setAddCashToAbsoluteValue: (addCashToAbsoluteValue: boolean) => void
  setBenchmark: (benchmark: Benchmark | null) => void
  setDataRange: (dataRange: DataRange) => void
  setShowInvestedCapital: (showInvestedCapital: boolean) => void
};

export type DepotPerformanceState = {
  addCashToAbsoluteValue: boolean
  benchmark: Benchmark | null
  dataRange: DataRange
  showInvestedCapital: boolean
  transactions: TransactionRead[]
};

const initialState: DepotPerformanceState = {
  addCashToAbsoluteValue: true,
  benchmark: null,
  dataRange: 'max',
  showInvestedCapital: true,
  transactions: []
} as const;

export type ReadableDepotPerformanceStore = ReadableSignalStore<DepotPerformanceState, DepotPerformanceComputed, DepotPerformanceMethods>;

export const DepotPerformanceStore = signalStore(
  withState(initialState),
  withComputed((signalStore: ReadableSignalStore<DepotPerformanceState>): DepotPerformanceComputed => {
    const globalStore: Store<AppState> = inject(Store);
    const depotValuesResult: Signal<DepotValuesResult> = depotValues(signalStore, globalStore);
    const depotValuesSignal: Signal<RebasedDepotValue[]> = computed((): RebasedDepotValue[] => depotValuesResult().values);
    const isRebasedSignal: Signal<boolean> = computed((): boolean => depotValuesResult().isRebased);
    return {
      benchmarkResult: benchmarkResult(signalStore, depotValuesSignal),
      dataRanges: dataRanges(globalStore, depotValuesSignal),
      depotValues: depotValuesSignal,
      extendedInternalRateOfReturn: extendedInternalRateOfReturn(globalStore),
      filteredDepotValues: isRebasedSignal,
      groupedTransactions: groupedTransaction(signalStore),
      kpis: depotPerformanceKpis(signalStore, depotValuesSignal, isRebasedSignal)
    };
  }),
  withMethods((signalStore: WritableSignalStore<DepotPerformanceState, DepotPerformanceComputed>): DepotPerformanceMethods => {
    return {
      setAddCashToAbsoluteValue: (addCashToAbsoluteValue: boolean): void => setAddCashToAbsoluteValue(signalStore, addCashToAbsoluteValue),
      setBenchmark: (benchmark: Benchmark | null): void => setBenchmark(signalStore, benchmark),
      setDataRange: (dataRange: DataRange): void => setDataRange(signalStore, dataRange),
      setShowInvestedCapital: (showInvestedCapital: boolean): void => setShowInvestedCapital(signalStore, showInvestedCapital)
    };
  }),
  withHooks({
    onInit(signalStore: WritableSignalStore<DepotPerformanceState, DepotPerformanceComputed>): void {
      const transactionApi: TransactionApi = inject(TransactionApi);
      const globalStore: Store<AppState> = inject(Store);
      const depotIds: Signal<number[]> = globalStore.selectSignal(selectedDepotIds);
      const depotValues: Signal<RebasedDepotValue[]> = signalStore.depotValues;
      const loadTransactionsFunction: RxMethod<LoadTransactionsArgs> = loadTransactions(signalStore, globalStore, transactionApi);
      loadTransactionsFunction(computed((): LoadTransactionsArgs => ({
        depotIds: depotIds(),
        depotValues: depotValues()
      })));
    }
  })
);
