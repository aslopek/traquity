import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {DepotPerformanceState} from '../depot-performance.store';
import {Benchmark, BenchmarkResult} from '../benchmark/benchmark.type';
import {computed, Signal} from '@angular/core';
import {RebasedDepotValue} from './rebased-depot-value.type';
import {fixedInterestBenchmark} from '../benchmark/fixed-interest-benchmark';

export function benchmarkResult(signalStore: ReadableSignalStore<DepotPerformanceState>,
                                depotValuesSignal: Signal<RebasedDepotValue[]>): Signal<BenchmarkResult | [BenchmarkResult, BenchmarkResult] | null> {
  const benchmarkArgsSignal: Signal<Benchmark | null> = signalStore.benchmark;

  return computed<BenchmarkResult | [BenchmarkResult, BenchmarkResult] | null>((): BenchmarkResult | [BenchmarkResult, BenchmarkResult] | null => {
    const benchmarkArgs: Benchmark | null = benchmarkArgsSignal();
    const depotValues: RebasedDepotValue[] = depotValuesSignal();
    if (benchmarkArgs == null || depotValues.length === 0) {
      return null;
    }

    if (benchmarkArgs.type === 'fixedInterest') {
      return fixedInterestBenchmark(benchmarkArgs, depotValues);
    }
    return null;
  });
}