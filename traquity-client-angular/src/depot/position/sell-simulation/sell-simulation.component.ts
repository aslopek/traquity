import {Component, computed, effect, inject, InputSignal, input, Signal, signal, untracked, WritableSignal,} from "@angular/core";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {
  FieldContext,
  FieldTree,
  form,
  FormField,
  max,
  min,
  minError,
  required,
  SchemaPathTree,
  validate,
  ValidationResult,
} from "@angular/forms/signals";
import {Store} from "@ngrx/store";
import {AppState} from "../../../store/app.state";
import {hideAbsoluteValues} from "../../../store/app-config/app-config.selector";
import {selectedDepotCurrency} from "../../../store/depot/depot.selector";
import {PositionDialogStore, ReadablePositionDialogStore, SellSimulationInputs} from "../position-dialog/store/position-dialog.store";
import {TqCurrencyPipe} from "../../../common/pipe/tq-currency.pipe";
import {TqDecimalPipe} from "../../../common/pipe/tq-decimal.pipe";

export type SellSimulationFormModel = {
  sharesToSell: number | null
  pricePerShare: number | null
  taxFreeGainsPercent: number | null
  taxRatePercent: number | null
  fee: number | null
  feesReduceTaxableGain: boolean
  buyTaxesReduceTaxableGain: boolean
};

@Component({
  selector: "app-sell-simulation",
  imports: [MatFormFieldModule, MatIconModule, MatInputModule, MatSlideToggleModule, FormField, TqCurrencyPipe, TqDecimalPipe],
  templateUrl: "./sell-simulation.component.html",
  styleUrl: "./sell-simulation.component.scss",
})
export class SellSimulationComponent {
  readonly securityIds: InputSignal<number[]> = input.required();

  protected readonly store: ReadablePositionDialogStore = inject(PositionDialogStore);
  protected readonly hideAbsoluteValues: Signal<boolean> = inject(Store<AppState>).selectSignal(hideAbsoluteValues);
  protected readonly depotCurrency: Signal<string> = inject(Store<AppState>).selectSignal(selectedDepotCurrency);

  protected readonly singleSecurity: Signal<boolean> = computed((): boolean => this.securityIds().length === 1);

  protected readonly formModel: WritableSignal<SellSimulationFormModel> = signal<SellSimulationFormModel>({
    sharesToSell: null,
    pricePerShare: null,
    taxFreeGainsPercent: 0,
    taxRatePercent: 0,
    fee: 0,
    feesReduceTaxableGain: true,
    buyTaxesReduceTaxableGain: true,
  });

  protected readonly form: FieldTree<SellSimulationFormModel> = form(this.formModel,
    (schemaPath: SchemaPathTree<SellSimulationFormModel>): void => {
      required(schemaPath.sharesToSell);
      max(schemaPath.sharesToSell, (): number => this.store.sharesHeld(), {message: "Cannot exceed the shares held"});
      validate(schemaPath.sharesToSell, (ctx: FieldContext<number | null>): ValidationResult => {
        const value: number | null = ctx.value();
        if (value != null && value <= 0) {
          return minError(0, {message: "Must be greater than 0"});
        }
        return null;
      });

      required(schemaPath.pricePerShare);
      min(schemaPath.pricePerShare, 0);

      required(schemaPath.taxFreeGainsPercent);
      min(schemaPath.taxFreeGainsPercent, 0);
      max(schemaPath.taxFreeGainsPercent, 100);

      required(schemaPath.taxRatePercent);
      min(schemaPath.taxRatePercent, 0);
      max(schemaPath.taxRatePercent, 100);

      required(schemaPath.fee);
      min(schemaPath.fee, 0);
    },
  );

  protected readonly validInputs: Signal<SellSimulationInputs | null> = computed((): SellSimulationInputs | null => {
    let valid: boolean = true;
    for (const [, field] of this.form) {
      valid = valid && field().valid();
    }
    const model: SellSimulationFormModel = this.formModel();
    if (!valid || model.sharesToSell == null || model.pricePerShare == null
      || model.taxFreeGainsPercent == null || model.taxRatePercent == null || model.fee == null) {
      return null;
    }
    return {
      sharesToSell: model.sharesToSell,
      pricePerShare: model.pricePerShare,
      taxFreeGainsPercent: model.taxFreeGainsPercent,
      taxRatePercent: model.taxRatePercent,
      fee: model.fee,
      feesReduceTaxableGain: model.feesReduceTaxableGain,
      buyTaxesReduceTaxableGain: model.buyTaxesReduceTaxableGain,
    };
  });

  private pricePerSharePrefilled: boolean = false;

  constructor() {
    effect((): void => {
      this.store.setSimulationInputs(this.validInputs());
    });

    effect((): void => {
      const price: number | null = this.store.currentPricePerShare();
      if (price == null || this.pricePerSharePrefilled) {
        return;
      }
      this.pricePerSharePrefilled = true;
      untracked((): void => {
        this.formModel.update((model: SellSimulationFormModel): SellSimulationFormModel => ({...model, pricePerShare: price}));
      });
    });
  }
}
