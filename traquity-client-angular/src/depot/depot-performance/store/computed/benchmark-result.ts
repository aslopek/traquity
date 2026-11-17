import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {DepotPerformanceState} from '../depot-performance.store';
import {Benchmark, BenchmarkResult} from '../benchmark/benchmark.type';
import {computed, Signal} from '@angular/core';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../store/app.state';
import {RebasedDepotValue} from './rebased-depot-value.type';
import {fixedInterestBenchmark} from '../benchmark/fixed-interest-benchmark';
import {securityBenchmark} from '../benchmark/security-cash-flow-based-benchmark';
import {SecurityNamePipe} from '../../../../common/pipe/security-name.pipe';
import {HistoricalSecurityPrice} from '../../../../gen/api/historical-security-price';

export function benchmarkResult(signalStore: ReadableSignalStore<DepotPerformanceState>,
                                depotValuesSignal: Signal<RebasedDepotValue[]>,
                                globalStore: Store<AppState>): Signal<BenchmarkResult | [BenchmarkResult, BenchmarkResult] | null> {
  const benchmarkArgsSignal: Signal<Benchmark | null> = signalStore.benchmark;
  const securityNamePipe: SecurityNamePipe = new SecurityNamePipe(globalStore);

  return computed<BenchmarkResult | [BenchmarkResult, BenchmarkResult] | null>((): BenchmarkResult | [BenchmarkResult, BenchmarkResult] | null => {
    const benchmarkArgs: Benchmark | null = benchmarkArgsSignal();
    const depotValues: RebasedDepotValue[] = depotValuesSignal();
    if (benchmarkArgs == null || depotValues.length === 0) {
      return null;
    }

    if (benchmarkArgs.type === 'fixedInterest') {
      return fixedInterestBenchmark(benchmarkArgs, depotValues);
    }

    const prices: HistoricalSecurityPrice[] = signalStore.benchmarkPrices()
      .filter((price: HistoricalSecurityPrice): boolean => price.securityId === benchmarkArgs.securityId);
    return securityBenchmark(benchmarkArgs, depotValues, prices, securityNamePipe);
  });
}
