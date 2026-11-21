import {Component, computed, inject, Signal, signal, WritableSignal} from '@angular/core';
import {FixedInterestBenchmarkComponent} from './fixed-interest-benchmark/fixed-interest-benchmark.component';
import {Benchmark, BenchmarkMode, FixedInterestBenchmarkMode, SecurityBenchmarkMode} from '../store/benchmark/benchmark.type';
import {DepotPerformanceStore, ReadableDepotPerformanceStore} from '../store/depot-performance.store';
import {MatButton} from '@angular/material/button';
import {MatButtonToggle, MatButtonToggleGroup} from '@angular/material/button-toggle';
import {SecurityCashflowBenchmarkComponent} from './security-cashflow-benchmark/security-cashflow-benchmark.component';

function isSecurityMode(mode: BenchmarkMode): mode is SecurityBenchmarkMode {
  return mode.startsWith('security.');
}

@Component({
  selector: 'app-benchmark',
  imports: [
    FixedInterestBenchmarkComponent,
    MatButton,
    MatButtonToggle,
    MatButtonToggleGroup,
    SecurityCashflowBenchmarkComponent
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

  protected readonly mode: WritableSignal<BenchmarkMode> = signal<BenchmarkMode>('security.cashFlowBased');

  protected readonly fixedInterestMode: Signal<FixedInterestBenchmarkMode | null> = computed<FixedInterestBenchmarkMode | null>(
    (): FixedInterestBenchmarkMode | null => {
      const mode: BenchmarkMode = this.mode();
      return isSecurityMode(mode) ? null : mode;
    });

  private restartWithNextBenchmark: boolean = false;

  protected onBenchmarkUpdate(benchmark: Benchmark | null): void {
    const restart: boolean = this.restartWithNextBenchmark;
    this.restartWithNextBenchmark = false;
    this.benchmark.set(benchmark);
    if (benchmark != null && (this.isBenchmarkActive() || restart)) {
      this.depotPerformanceStore.setBenchmark(benchmark);
    }
  }

  protected selectMode(mode: BenchmarkMode): void {
    if (isSecurityMode(this.mode()) !== isSecurityMode(mode)) {
      this.restartWithNextBenchmark = this.depotPerformanceStore.benchmark() !== null;
      this.benchmark.set(null);
      if (this.restartWithNextBenchmark) {
        this.depotPerformanceStore.setBenchmark(null);
      }
    }
    this.mode.set(mode);
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
