import {Component, computed, inject, Signal, signal, WritableSignal} from '@angular/core';
import {FixedInterestBenchmarkComponent} from './fixed-interest-benchmark/fixed-interest-benchmark.component';
import {Benchmark, BenchmarkMode, FixedInterestBenchmarkMode, SecurityBenchmarkMode} from '../store/benchmark/benchmark.type';
import {DepotPerformanceStore, ReadableDepotPerformanceStore} from '../store/depot-performance.store';
import {MatButton} from '@angular/material/button';
import {MatButtonToggle, MatButtonToggleGroup} from '@angular/material/button-toggle';
import {SecurityBenchmarkComponent} from './security-benchmark/security-benchmark.component';
import {BenchmarkOutcomesComponent} from './benchmark-outcomes/benchmark-outcomes.component';
import {BenchmarkOutcome} from '../store/computed/benchmark-outcomes';

function isSecurityMode(mode: BenchmarkMode): mode is SecurityBenchmarkMode {
  return mode.startsWith('security.');
}

@Component({
  selector: 'app-benchmark',
  imports: [
    BenchmarkOutcomesComponent,
    FixedInterestBenchmarkComponent,
    MatButton,
    MatButtonToggle,
    MatButtonToggleGroup,
    SecurityBenchmarkComponent
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

  protected readonly benchmarkOutcomes: Signal<BenchmarkOutcome[]> = this.depotPerformanceStore.benchmarkOutcomes;

  protected readonly mode: WritableSignal<BenchmarkMode> = signal<BenchmarkMode>('security.cashFlowBased');

  protected readonly fixedInterestMode: Signal<FixedInterestBenchmarkMode | null> = computed<FixedInterestBenchmarkMode | null>(
    (): FixedInterestBenchmarkMode | null => {
      const mode: BenchmarkMode = this.mode();
      return isSecurityMode(mode) ? null : mode;
    });

  protected readonly securityMode: Signal<SecurityBenchmarkMode | null> = computed<SecurityBenchmarkMode | null>(
    (): SecurityBenchmarkMode | null => {
      const mode: BenchmarkMode = this.mode();
      return isSecurityMode(mode) ? mode : null;
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
