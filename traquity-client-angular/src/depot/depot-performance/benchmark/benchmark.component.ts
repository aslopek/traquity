import {Component, computed, inject, Signal, signal, WritableSignal} from '@angular/core';
import {FixedInterestBenchmarkComponent, FixedInterestBenchmarkMode} from './fixed-interest-benchmark/fixed-interest-benchmark.component';
import {Benchmark} from '../store/benchmark/benchmark.type';
import {DepotPerformanceStore, ReadableDepotPerformanceStore} from '../store/depot-performance.store';
import {MatButton} from '@angular/material/button';
import {MatButtonToggle, MatButtonToggleGroup} from '@angular/material/button-toggle';

type BenchmarkMode = FixedInterestBenchmarkMode;

@Component({
  selector: 'app-benchmark',
  imports: [
    FixedInterestBenchmarkComponent,
    MatButton,
    MatButtonToggle,
    MatButtonToggleGroup
  ],
  templateUrl: './benchmark.component.html',
  styleUrl: './benchmark.component.scss',
})
export class BenchmarkComponent {

  protected benchmark: WritableSignal<Benchmark | null> = signal<Benchmark | null>(null);

  private readonly depotPerformanceStore: ReadableDepotPerformanceStore = inject(DepotPerformanceStore);

  protected readonly isBenchmarkActive: Signal<boolean> = computed<boolean>((): boolean => {
    return this.depotPerformanceStore.benchmarkResult() !== null;
  });

  protected readonly mode: WritableSignal<BenchmarkMode> = signal<BenchmarkMode>('fixedInterest.cashFlowBased');

  protected onBenchmarkUpdate(benchmark: Benchmark | null): void {
    this.benchmark.set(benchmark);
    if (benchmark != null && this.isBenchmarkActive()) {
      this.depotPerformanceStore.setBenchmark(benchmark);
    }
  }

  protected startBenchmark(): void {
    if (this.benchmark()) {
      this.depotPerformanceStore.setBenchmark(this.benchmark());
    }
  }

  protected stopBenchmark(): void {
    this.depotPerformanceStore.setBenchmark(null);
  }
}
