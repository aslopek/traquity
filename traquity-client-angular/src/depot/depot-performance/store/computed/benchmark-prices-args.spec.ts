import {beforeEach, describe, expect, it} from '@jest/globals';
import {Signal, signal, WritableSignal} from '@angular/core';
import {Benchmark} from '../benchmark/benchmark.type';
import {LoadBenchmarkPricesArgs} from '../effects/load-benchmark-prices';
import {benchmarkPricesArgs} from './benchmark-prices-args';

describe('benchmarkPricesArgs', (): void => {
  const securityId: number = 7;

  let benchmark: WritableSignal<Benchmark | null>;
  let currency: WritableSignal<string>;

  beforeEach((): void => {
    benchmark = signal<Benchmark | null>({
      type: 'security',
      mode: 'cashFlowBased',
      securityId,
      initialInvestment: 100
    });
    currency = signal<string>('EUR');
  });

  it('holds the security of the benchmark and the currency', (): void => {
    expect(benchmarkPricesArgs({benchmark}, currency)()).toEqual({
      securityId,
      currency: currency()
    });
  });

  it('holds no security without a benchmark', (): void => {
    benchmark.set(null);

    expect(benchmarkPricesArgs({benchmark}, currency)()).toEqual({
      securityId: null,
      currency: currency()
    });
  });

  it('holds no security for a fixed interest benchmark', (): void => {
    benchmark.set({
      type: 'fixedInterest',
      mode: 'cashFlowBased',
      interestPerYear: 1,
      daysPerYear: 365,
      yieldInterval: 'monthly'
    });

    expect(benchmarkPricesArgs({benchmark}, currency)()).toEqual({
      securityId: null,
      currency: currency()
    });
  });

  it('keeps the very same value when only the initial investment changes', (): void => {
    const args: Signal<LoadBenchmarkPricesArgs> = benchmarkPricesArgs({benchmark}, currency);
    const before: LoadBenchmarkPricesArgs = args();

    benchmark.set({
      type: 'security',
      mode: 'cashFlowBased',
      securityId,
      initialInvestment: 200
    });

    expect(args()).toBe(before);
  });

  it('changes when the security changes', (): void => {
    const args: Signal<LoadBenchmarkPricesArgs> = benchmarkPricesArgs({benchmark}, currency);
    expect(args().securityId).toBe(securityId);

    benchmark.set({type: 'security', mode: 'cashFlowBased', securityId: securityId + 1});

    expect(args()).toEqual({
      securityId: securityId + 1,
      currency: currency()
    });
  });

  it('changes when the currency changes', (): void => {
    const args: Signal<LoadBenchmarkPricesArgs> = benchmarkPricesArgs({benchmark}, currency);
    expect(args().currency).toBe('EUR');

    currency.set('USD');

    expect(args()).toEqual({
      securityId,
      currency: 'USD'
    });
  });
});
