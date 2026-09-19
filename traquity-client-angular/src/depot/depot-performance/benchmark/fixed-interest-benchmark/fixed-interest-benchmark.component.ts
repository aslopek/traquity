import {Component, computed, effect, EventEmitter, inject, input, InputSignal, Output, Signal, signal, WritableSignal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatRadioModule} from '@angular/material/radio';
import {FixedInterestBenchmark} from "../../store/benchmark/benchmark.type";
import {FieldTree, form, max, min, required, SchemaPathTree,} from "@angular/forms/signals";
import {MatTooltip} from "@angular/material/tooltip";
import {DepotPerformanceStore, ReadableDepotPerformanceStore} from "../../store/depot-performance.store";
import {RebasedDepotValue} from "../../store/computed/rebased-depot-value.type";

export type FixedInterestBenchmarkMode = 'fixedInterest.cashFlowBased' | 'fixedInterest.intervalBased';

type BenchmarkFormModel = {
  interestPerYear: number | null;
  daysPerYear: 360 | 365;
  yieldInterval: 'monthly' | 'quarterly' | 'annually';
  initialInvestment: number | null;
  depositDay: number;
  isReinvestCashflow: boolean;
  investmentAmount: number | null;
}

@Component({
  selector: 'app-fixed-interest-benchmark',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatRadioModule,
    MatTooltip
  ],
  templateUrl: './fixed-interest-benchmark.component.html',
  styleUrls: ['./fixed-interest-benchmark.component.scss']
})
export class FixedInterestBenchmarkComponent {

  readonly mode: InputSignal<FixedInterestBenchmarkMode | undefined> = input<FixedInterestBenchmarkMode>();

  @Output()
  readonly benchmark: EventEmitter<FixedInterestBenchmark | null> = new EventEmitter<FixedInterestBenchmark | null>();

  protected readonly formModel: WritableSignal<BenchmarkFormModel> = signal<BenchmarkFormModel>({
    interestPerYear: 1,
    daysPerYear: 365,
    yieldInterval: 'quarterly',
    initialInvestment: null,
    depositDay: 1,
    isReinvestCashflow: true,
    investmentAmount: 100
  });

  protected readonly form: FieldTree<BenchmarkFormModel> = form(this.formModel, (schemaPath: SchemaPathTree<BenchmarkFormModel>): void => {
      required(schemaPath.interestPerYear);
      min(schemaPath.interestPerYear, 0);

      required(schemaPath.daysPerYear);
      required(schemaPath.yieldInterval);

    if (this.mode() === 'fixedInterest.intervalBased') {
        required(schemaPath.depositDay);
        min(schemaPath.depositDay, 1);
        max(schemaPath.depositDay, 28);

        if (this.formModel().initialInvestment !== null) {
          min(schemaPath.initialInvestment, 0);
        }

        if (!this.formModel().isReinvestCashflow) {
          required(schemaPath.investmentAmount);
          min(schemaPath.investmentAmount, 0);
        }
      }
    }
  );

  private readonly benchmarkObject: Signal<FixedInterestBenchmark | null> = computed<FixedInterestBenchmark | null>(() => {
    let valid: boolean = true;
    for (const [, field] of this.form) {
      valid = valid && field().valid();
    }
    if (!valid) {
      return null;
    }

    const current: BenchmarkFormModel = this.formModel();
    const baseConfig: Pick<FixedInterestBenchmark, 'type' | 'interestPerYear' | 'daysPerYear' | 'yieldInterval' | 'initialInvestment'> = {
      type: 'fixedInterest',
      interestPerYear: current.interestPerYear!,
      daysPerYear: current.daysPerYear,
      yieldInterval: current.yieldInterval,
      initialInvestment: current.initialInvestment ?? undefined,
    };

    if (this.mode() === 'fixedInterest.cashFlowBased') {
      return {
        ...baseConfig,
        mode: 'cashFlowBased'
      } satisfies FixedInterestBenchmark;
    } else {
      return {
        ...baseConfig,
        mode: 'intervalBased',
        depositInterval: 'monthly',
        depositDay: current.depositDay,
        investmentPerInterval: current.isReinvestCashflow ? 'reinvestCashFlow' : (current.investmentAmount ?? 0),
      } satisfies FixedInterestBenchmark;
    }
  });

  private readonly depotPerformanceStore: ReadableDepotPerformanceStore = inject(DepotPerformanceStore);
  private readonly depotValues: Signal<RebasedDepotValue[]> = this.depotPerformanceStore.depotValues;

  constructor() {
    effect((): void => {
      this.benchmark.emit(this.benchmarkObject());
    });

    effect((): void => {
      this.updateFormValue('initialInvestment', this.depotValues()[0].absoluteValue);
    });
  }

  protected updateFormValue<K extends keyof BenchmarkFormModel>(key: K, value: BenchmarkFormModel[K]): void {
    this.formModel.update(current => ({
      ...current,
      [key]: value
    }));
  }

  protected readonly parseFloat = parseFloat;
  protected readonly parseInt = parseInt;
}
