import {Component, computed, effect, EventEmitter, inject, Output, Signal, signal, untracked, WritableSignal} from '@angular/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FieldTree, form, FormField, min, SchemaPathTree} from '@angular/forms/signals';
import {SecurityBenchmark, SecurityCashFlowBasedBenchmark} from '../../store/benchmark/benchmark.type';
import {DepotPerformanceStore} from '../../store/depot-performance.store';
import {RebasedDepotValue} from '../../store/computed/rebased-depot-value.type';
import {BenchmarkSecuritySelectComponent} from '../benchmark-security-select/benchmark-security-select.component';

export type SecurityCashFlowBenchmarkFormModel = {
  initialInvestment: number | null
};

@Component({
  selector: 'app-security-cashflow-benchmark',
  imports: [
    BenchmarkSecuritySelectComponent,
    FormField,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './security-cashflow-benchmark.component.html',
  styleUrl: './security-cashflow-benchmark.component.scss'
})
export class SecurityCashflowBenchmarkComponent {

  /** Emits the benchmark the form describes, `null` while no security is picked or the form is invalid. */
  @Output()
  readonly benchmark: EventEmitter<SecurityCashFlowBasedBenchmark | null> = new EventEmitter<SecurityCashFlowBasedBenchmark | null>();

  private readonly formModel: WritableSignal<SecurityCashFlowBenchmarkFormModel> = signal<SecurityCashFlowBenchmarkFormModel>({
    initialInvestment: null
  });

  protected readonly form: FieldTree<SecurityCashFlowBenchmarkFormModel> = form(this.formModel,
    (schemaPath: SchemaPathTree<SecurityCashFlowBenchmarkFormModel>): void => {
      min(schemaPath.initialInvestment, 0, {message: 'Must not be negative'});
    }
  );

  private readonly securityId: WritableSignal<number | null> = signal<number | null>(null);

  private readonly depotValues: Signal<RebasedDepotValue[]> = inject(DepotPerformanceStore).depotValues;

  private readonly benchmarkObject: Signal<SecurityBenchmark | null> = computed((): SecurityBenchmark | null => {
    const securityId: number | null = this.securityId();
    if (securityId === null || !this.form().valid()) {
      return null;
    }
    return {
      type: 'security',
      mode: 'cashFlowBased',
      securityId,
      initialInvestment: this.formModel().initialInvestment ?? undefined
    };
  });

  private prefilled: boolean = false;

  constructor() {
    effect((): void => {
      this.benchmark.emit(this.benchmarkObject());
    });

    effect((): void => {
      const oldestAbsoluteValue: number | null = this.depotValues()[0]?.absoluteValue ?? null;
      untracked((): void => {
        if (!this.prefilled || this.formModel().initialInvestment !== null) {
          this.formModel.set({initialInvestment: oldestAbsoluteValue});
        }
        this.prefilled = true;
      });
    });
  }

  protected pickSecurity(securityId: number | null): void {
    this.securityId.set(securityId);
  }
}
