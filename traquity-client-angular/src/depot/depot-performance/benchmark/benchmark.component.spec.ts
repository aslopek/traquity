import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Injector, runInInjectionContext, signal, WritableSignal} from '@angular/core';
import {Benchmark, BenchmarkResult, FixedInterestBenchmark, SecurityBenchmark} from '../store/benchmark/benchmark.type';
import {DepotPerformanceStore} from '../store/depot-performance.store';
import {BenchmarkComponent} from './benchmark.component';

jest.mock('../store/depot-performance.store', (): unknown => ({
  DepotPerformanceStore: class DepotPerformanceStore {
  }
}));

describe('BenchmarkComponent', (): void => {
  let storedBenchmark: WritableSignal<Benchmark | null>;
  let storedResult: WritableSignal<BenchmarkResult | null>;
  let setBenchmark: jest.Mock<(benchmark: Benchmark | null) => void>;
  let fixedInterest: FixedInterestBenchmark;
  let security: SecurityBenchmark;
  let component: BenchmarkComponent;

  beforeEach((): void => {
    fixedInterest = {
      type: 'fixedInterest',
      mode: 'cashFlowBased',
      interestPerYear: 1,
      daysPerYear: 365,
      yieldInterval: 'monthly'
    };
    security = {
      type: 'security',
      mode: 'cashFlowBased',
      securityId: 7,
      initialInvestment: 100
    };

    storedBenchmark = signal<Benchmark | null>(fixedInterest);

    storedResult = signal<BenchmarkResult | null>({
      name: 'Fixed Interest Benchmark',
      values: [1]
    });

    setBenchmark = jest.fn<(benchmark: Benchmark | null) => void>();
    component = runInInjectionContext(Injector.create({
      providers: [
        {
          provide: DepotPerformanceStore,
          useValue: {
            benchmark: storedBenchmark,
            benchmarkResult: storedResult,
            setBenchmark
          }
        }
      ]
    }), (): BenchmarkComponent => new BenchmarkComponent());
  });

  describe('onBenchmarkUpdate', (): void => {
    it('draws nothing for a form emitting no benchmark', (): void => {
      component['onBenchmarkUpdate'](null);

      expect(setBenchmark).not.toHaveBeenCalled();
      expect(component['benchmark']()).toBeNull();
    });

    it('follows the form with the running line', (): void => {
      component['onBenchmarkUpdate'](fixedInterest);

      expect(setBenchmark.mock.calls).toEqual([[fixedInterest]]);
      expect(component['benchmark']()).toBe(fixedInterest);
    });

    it('draws nothing for a form update while no line runs', (): void => {
      storedBenchmark.set(null);
      storedResult.set(null);

      component['onBenchmarkUpdate'](fixedInterest);

      expect(setBenchmark).not.toHaveBeenCalled();
      expect(component['benchmark']()).toBe(fixedInterest);
    });

    it('starts the newly mounted form\'s benchmark when the line was running before switching modes', (): void => {
      component['restartWithNextBenchmark'] = true;
      storedBenchmark.set(null);
      storedResult.set(null);

      component['onBenchmarkUpdate'](security);

      expect(setBenchmark.mock.calls).toEqual([[security]]);
      expect(component['benchmark']()).toBe(security);
    });

    it('drops a pending restart when the newly mounted form emits no benchmark', (): void => {
      component['restartWithNextBenchmark'] = true;
      storedBenchmark.set(null);
      storedResult.set(null);

      component['onBenchmarkUpdate'](null);

      expect(setBenchmark).not.toHaveBeenCalled();
      expect(component['benchmark']()).toBeNull();
      expect(component['restartWithNextBenchmark']).toBe(false);
    });
  });

  describe('selectMode', (): void => {
    it('removes the running security line when switching to a fixed interest mode', (): void => {
      storedBenchmark.set(security);

      component['selectMode']('fixedInterest.cashFlowBased');

      expect(setBenchmark.mock.calls).toEqual([[null]]);
    });

    it('keeps the running line when switching between security modes', (): void => {
      storedBenchmark.set(security);

      component['selectMode']('security.luckyInvestor');

      expect(setBenchmark).not.toHaveBeenCalled();
      expect(component['mode']()).toBe('security.luckyInvestor');
    });

    describe('from a fixed interest mode', (): void => {
      beforeEach((): void => {
        component['mode'].set('fixedInterest.cashFlowBased');
      });

      it('keeps the running line when switching between fixed interest modes', (): void => {
        component['selectMode']('fixedInterest.intervalBased');

        expect(setBenchmark).not.toHaveBeenCalled();
        expect(component['mode']()).toBe('fixedInterest.intervalBased');
      });

      it('removes the running line and the stale benchmark when switching to the security mode', (): void => {
        component['benchmark'].set(fixedInterest);

        component['selectMode']('security.cashFlowBased');

        expect(setBenchmark.mock.calls).toEqual([[null]]);
        expect(component['benchmark']()).toBeNull();
        expect(component['mode']()).toBe('security.cashFlowBased');
      });
    });
  });
});
