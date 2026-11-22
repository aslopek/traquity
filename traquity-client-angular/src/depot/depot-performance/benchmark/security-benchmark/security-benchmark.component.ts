import {
  Component,
  computed,
  effect,
  EventEmitter,
  inject,
  input,
  InputSignal,
  Output,
  Signal,
  signal,
  untracked,
  WritableSignal
} from '@angular/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {
  FieldContext,
  FieldTree,
  form,
  FormField,
  hidden,
  max,
  min,
  required,
  SchemaPathTree,
  validate,
  ValidationResult
} from '@angular/forms/signals';
import {SecurityBenchmark, SecurityBenchmarkMode} from '../../store/benchmark/benchmark.type';
import {DepotPerformanceStore} from '../../store/depot-performance.store';
import {RebasedDepotValue} from '../../store/computed/rebased-depot-value.type';
import {BenchmarkSecuritySelectComponent} from '../benchmark-security-select/benchmark-security-select.component';

export type SecurityBenchmarkFormModel = {
  initialInvestment: number | null
  depositDay: number | null
  isReinvestCashflow: boolean
  investmentAmount: number | null
};

@Component({
  selector: 'app-security-benchmark',
  imports: [
    BenchmarkSecuritySelectComponent,
    FormField,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule
  ],
  templateUrl: './security-benchmark.component.html',
  styleUrl: './security-benchmark.component.scss'
})
export class SecurityBenchmarkComponent {

  /** The mode of the benchmark the form describes. */
  readonly mode: InputSignal<SecurityBenchmarkMode> = input.required<SecurityBenchmarkMode>();

  /** Emits the benchmark the form describes, `null` while no security is picked or the form is invalid. */
  @Output()
  readonly benchmark: EventEmitter<SecurityBenchmark | null> = new EventEmitter<SecurityBenchmark | null>();

  private readonly formModel: WritableSignal<SecurityBenchmarkFormModel> = signal<SecurityBenchmarkFormModel>({
    initialInvestment: null,
    depositDay: 1,
    isReinvestCashflow: true,
    investmentAmount: 100
  });

  protected readonly form: FieldTree<SecurityBenchmarkFormModel> = form(this.formModel,
    (schemaPath: SchemaPathTree<SecurityBenchmarkFormModel>): void => {
      min(schemaPath.initialInvestment, 0, {message: 'Must not be negative'});

      hidden(schemaPath.depositDay, {
        when: (): boolean => this.mode() !== 'security.intervalBased'
      });

      required(schemaPath.depositDay, {
        message: 'Required'
      });

      min(schemaPath.depositDay, 1, {
        message: 'Must be between 1 and 28'
      });

      max(schemaPath.depositDay, 28, {
        message: 'Must be between 1 and 28'
      });

      validate(schemaPath.depositDay, (ctx: FieldContext<number | null>): ValidationResult => {
        const value: number | null = ctx.value();
        if (value != null && !Number.isInteger(value)) {
          return {
            kind: 'integer',
            message: 'Must be a whole number'
          };
        }
        return null;
      });

      hidden(schemaPath.isReinvestCashflow, {
        when: (): boolean => this.mode() !== 'security.intervalBased'
      });

      hidden(schemaPath.investmentAmount, {
        when: (ctx: FieldContext<number | null>): boolean =>
          this.mode() !== 'security.intervalBased' || ctx.valueOf(schemaPath.isReinvestCashflow)
      });
      required(schemaPath.investmentAmount, {
        message: 'Required'
      });

      min(schemaPath.investmentAmount, 0, {
        message: 'Must not be negative'
      });
    }
  );

  private readonly securityId: WritableSignal<number | null> = signal<number | null>(null);

  private readonly depotValues: Signal<RebasedDepotValue[]> = inject(DepotPerformanceStore).depotValues;

  private readonly benchmarkObject: Signal<SecurityBenchmark | null> = computed((): SecurityBenchmark | null => {
    const securityId: number | null = this.securityId();
    if (securityId === null || !this.form().valid()) {
      return null;
    }

    const model: SecurityBenchmarkFormModel = this.formModel();
    const initialInvestment: number | undefined = model.initialInvestment ?? undefined;

    switch (this.mode()) {
      case 'security.cashFlowBased':
        return {
          type: 'security',
          mode: 'cashFlowBased',
          securityId,
          initialInvestment
        };
      case 'security.intervalBased':
        return {
          type: 'security',
          mode: 'intervalBased',
          securityId,
          initialInvestment,
          depositInterval: 'monthly',
          depositDay: model.depositDay ?? 1,
          investmentPerInterval: model.isReinvestCashflow ? 'reinvestCashFlow' : model.investmentAmount!
        };
      case 'security.luckyInvestor':
        return {
          type: 'security',
          mode: 'luckyInvestor',
          securityId,
          initialInvestment
        };
    }
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
          this.formModel.update((model: SecurityBenchmarkFormModel): SecurityBenchmarkFormModel => ({
            ...model,
            initialInvestment: oldestAbsoluteValue
          }));
        }
        this.prefilled = true;
      });
    });
  }

  protected pickSecurity(securityId: number | null): void {
    this.securityId.set(securityId);
  }
}
