import {computed, Signal} from '@angular/core';
import {ReadableSignalStore} from '../../../../common/types/signal-store.type';
import {DepotPerformanceState} from '../depot-performance.store';
import {Benchmark} from '../benchmark/benchmark.type';
import {LoadBenchmarkPricesArgs} from '../effects/load-benchmark-prices';

/**
 * @param signalStore the store holding the benchmark
 * @param depotCurrency the currency the prices are requested in
 * @returns the security of the benchmark, `null` for a benchmark without one, and the currency; it changes only when the security
 * or the currency does
 */
export function benchmarkPricesArgs(signalStore: ReadableSignalStore<Pick<DepotPerformanceState, 'benchmark'>>,
                                    depotCurrency: Signal<string>): Signal<LoadBenchmarkPricesArgs> {
  const securityId: Signal<number | null> = computed((): number | null => {
    const benchmark: Benchmark | null = signalStore.benchmark();
    return benchmark?.type === 'security' ? benchmark.securityId : null;
  });
  return computed((): LoadBenchmarkPricesArgs => ({
    securityId: securityId(),
    currency: depotCurrency()
  }));
}
