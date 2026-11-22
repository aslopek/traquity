import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {DepotPerformanceState} from '../depot-performance.store';
import {Benchmark, BenchmarkResult} from '../benchmark/benchmark.type';
import {computed, Signal} from '@angular/core';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../store/app.state';
import {RebasedDepotValue} from './rebased-depot-value.type';
import {fixedInterestBenchmark} from '../benchmark/fixed-interest-benchmark';
import {securityCashFlowBasedBenchmark} from '../benchmark/security-cash-flow-based-benchmark';
import {securityIntervalBasedBenchmark} from '../benchmark/security-interval-based-benchmark';
import {securityLuckyInvestorBenchmark} from '../benchmark/security-lucky-investor-benchmark';
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

    switch (benchmarkArgs.mode) {
      case 'cashFlowBased':
        return securityCashFlowBasedBenchmark(benchmarkArgs, depotValues, prices, securityNamePipe);
      case 'intervalBased':
        return securityIntervalBasedBenchmark(benchmarkArgs, depotValues, prices, securityNamePipe);
      case 'luckyInvestor':
        return securityLuckyInvestorBenchmark(benchmarkArgs, depotValues, prices, securityNamePipe);
    }
  });
}
